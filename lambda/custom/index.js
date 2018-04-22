'use strict';
const Alexa = require("alexa-sdk");
const moment = require("moment");
const request = require('request');

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    // alexa.dynamoDBTableName = 'MeetingSchedulerSessionInfo';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const welcomeOutput = "Let's book a meeting.  What meeting would you like to book?";
const welcomeReprompt = "Let me know about the meeting you would like to schedule.";

const API_HOST = "meeting-scheduler.us-east-1.elasticbeanstalk.com";
const API_BASE = "http://"+API_HOST;

var handlers = {

    'LaunchRequest': function () {
        console.log("in LaunchRequest");
        this.response.speak(welcomeOutput).listen(welcomeReprompt);
        this.emit(':responseReady');
    },

    'BookMeeting': function () {

        console.log("in BookMeeting");

        const filledSlots = delegateSlotCollection.call(this);
        console.log("bar", filledSlots);

        const meetingName = this.event.request.intent.slots.meetingName.value;
        const roomName = this.event.request.intent.slots.meetingRoom.value;
        const duration = this.event.request.intent.slots.meetingDuration.value;
        const day = this.event.request.intent.slots.meetingDay.value;
        const startTime = this.event.request.intent.slots.startTime.value;

        let msg = "";

        if(this.event.request.intent.confirmationStatus === "DENIED") {
            msg = "Meeting request dropped.";
            // TODO should I got back to this meeting?

            this.emit(':responseReady');

        } else if (this.event.request.intent.confirmationStatus === "CONFIRMED") {

            console.log("confirmed, calling API");
            const startDateTime = getDateTime(day, startTime);
            const endDateTime = getEndDateTime(startDateTime, duration);

            const meetingInfo = {
                name: meetingName,
                startDateTime: startDateTime.format(),
                endDateTime: endDateTime.format(),
                participants: ["zednis@rpi.edu"],
                room: "Pikes Peak"
            };


            request.post({
                method: 'POST',
                uri: API_BASE+"/api/meetings",
                body: meetingInfo,
                json: true
            }, (error, response, body) => {
                console.log(response);
                console.log("created: ", body.created);
                const msg = "Your meeting has been booked.";
                this.response.speak(msg).cardRenderer("Meeting Scheduler", msg);
                this.emit(':responseReady');
            });
        }
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

function delegateSlotCollection() {

    console.log("in delegateSlotCollection");
    console.log("current dialogState: "+this.event.request.dialogState);

    if(this.event.request.dialogState === "STARTED") {

        let updatedIntent = this.event.request.intent;


        // default to meeting today
        if(!updatedIntent.slots.meetingDay.value) {
            updatedIntent.slots.meetingDay.value = moment().format("YYYY-MM-DD");
        }

        // default to 1-hour meeting
        if(!updatedIntent.slots.meetingDuration.value) {
            updatedIntent.slots.meetingDuration.value = "PT1H";
        }

        updatedIntent.slots.prettyDuration.value = prettifyDuration(updatedIntent.slots.meetingDuration.value);

        console.log(updatedIntent);
        this.emit(":delegate", updatedIntent);

    } else if(this.event.request.dialogState !== "COMPLETED") {
        console.log("in not completed");
        this.emit(":delegate");
    } else {
        console.log("in completed");

        // update prettyDuration with prettified meetingDuration value for speech back to user in meeting confirmation
        const prettyDuration = prettifyDuration(this.event.request.intent.slots.meetingDuration.value);
        this.event.request.intent.slots.prettyDuration.value = prettyDuration;

        console.log("foo", this.event.request.intent);
        return this.event.request.intent;
    }
}

const sayDate = function (date) {
    return moment(date).format('dddd');
};

const getDateTime = function(date, time) {
    return moment(date+" "+time, "YYYY-MM-DD HH:mm")
};

const getEndDateTime = function (datetime, duration) {
    const durationObj = getDurationObject(duration);
    return moment(datetime).add(durationObj);
};

const prettifyDuration = function (duration) {

    const days = duration.match(/\d+D/g);
    const hours = duration.match(/\d+H/g);
    const mins = duration.match(/\d+M/g);
    const secs = duration.match(/\d+(.\d+)?S/g);

    let msg = "";

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

const getDurationObject = function(durationString) {
    const days = durationString.match(/\d+D/g);
    const hours = durationString.match(/\d+H/g);
    const mins = durationString.match(/\d+M/g);
    const secs = durationString.match(/\d+(.\d+)?S/g);

    let obj = {};

    if(days) {
        obj["days"] = parseInt(String(days).slice(0, -1));
    }

    if(hours) {
        obj["hours"] = parseInt(String(hours).slice(0, -1));
    }

    if(mins) {
        obj["minutes"] = parseInt(String(mins).slice(0, -1));
    }

    if(secs) {
        obj["seconds"] = parseFloat(String(secs).slice(0, -1));
    }

    return obj;
};