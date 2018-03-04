'use strict';
var Alexa = require("alexa-sdk");
var moment = require("moment");

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    // alexa.dynamoDBTableName = 'MeetingSchedulerSessionInfo';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const welcomeOutput = "Let's book a meeting.  What meeting would you like to book?";
const welcomeReprompt = "Let me know about the meeting you would like to schedule.";

var handlers = {

    'LaunchRequest': function () {
        console.log("in LaunchRequest");
        this.response.speak(welcomeOutput).listen(welcomeReprompt);
        this.emit(':responseReady');
    },
    'BookMeeting': function () {

        console.log("in BookMeeting");

        const filledSlots = delegateSlotCollection.call(this);
        console.log(filledSlots);

        // const roomName = this.event.request.intent.slots.meetingRoom.value;
        // const duration = this.event.request.intent.slots.meetingDuration.value;
        // const day = this.event.request.intent.slots.meetingDay.value;
        // const time = this.event.request.intent.slots.startTime.value;

        let msg = "";

        if(this.event.request.intent.confirmationStatus === "DENIED") {
            msg = "Meeting request dropped.";
            // TODO should I got back to this meeting?

        } else if (this.event.request.intent.confirmationStatus === "CONFIRMED") {
            msg = "Your meeting has been booked.";
        }

        this.response.speak(msg).cardRenderer("Meeting Scheduler", msg);
        this.emit(':responseReady');
    },
    'SessionEndedRequest' : function() {
        console.log('Session ended with reason: ' + this.event.request.reason);
    },
    'AMAZON.StopIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent' : function() {
        this.response.speak("You can try: 'alexa, open meeting scheduler' or 'alexa, ask meeting scheduler to book room 42 at 2PM'");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'Unhandled' : function() {
        this.response.speak("Sorry, I didn't get that. You can try: 'alexa, open meeting scheduler'");
    }
};

function delegateSlotCollection(){

    console.log("in delegateSlotCollection");
    console.log("current dialogState: "+this.event.request.dialogState);

    if(this.event.request.dialogState === "STARTED") {

        let updatedIntent = this.event.request.intent;

        // default to meeting today
        if(!updatedIntent.slots.meetingDay.value) {
            updatedIntent.slots.meetingDay.value = moment().utc().format("YYYY-MM-DD");
        }

        // default to 1-hour meeting
        if(!updatedIntent.slots.meetingDuration.value) {
            updatedIntent.slots.meetingDuration.value = "PT1H";
        }

        console.log(updatedIntent);
        this.emit(":delegate", updatedIntent);

    } else if(this.event.request.dialogState !== "COMPLETED") {
        console.log("in not completed");
        this.emit(":delegate");
    } else {
        console.log("in completed");
        return this.event.request.intent;
    }
}

const sayDate = function (date) {
    return moment(date).format('dddd');
};

const sayDuration = function (duration) {

    console.log("parsing duration " + duration);

    var days = duration.match(/\d+D/g);
    var hours = duration.match(/\d+H/g);
    var mins = duration.match(/\d+M/g);
    var secs = duration.match(/\d+(.\d+)?S/g);

    var msg = "";

    if (days) {
        const _days = parseInt(String(days).slice(0, -1));
        const unit = (_days > 1) ? "days" : "day";
        msg += _days + " " + unit;
    }

    if (hours) {
        const _hours = parseInt(String(hours).slice(0, -1));
        const unit = (_hours > 1) ? "hours" : "hour";
        const prefix = (msg.length > 0) ? " " : "";
        msg += prefix + _hours + " " + unit;
    }

    if (mins) {
        const _mins = parseInt(String(mins).slice(0, -1));
        const unit = (_mins > 1) ? "minutes" : "minute";
        const prefix = (msg.length > 0) ? " and " : "";
        msg += prefix + _mins + " " + unit;
    }

    if (secs) {
        const _secs = parseFloat(String(secs).slice(0, -1));
        const unit = (_secs !== 1) ? "seconds" : "second";
        const prefix = (msg.length > 0) ? " and " : "";
        msg += prefix + _secs + " " + unit;
    }

    return msg;
};