'use strict';
var Alexa = require("alexa-sdk");

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    // alexa.dynamoDBTableName = 'MeetingFoo';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var sayDuration = function (duration) {

    console.log("parsing duration "+duration);

    var days = duration.match(/\d+D/g);
    var hours = duration.match(/\d+H/g);
    var mins = duration.match(/\d+M/g);
    var secs = duration.match(/\d+(.\d+)?S/g);

    var msg = "";

    if(days) {
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

    if(secs) {
        const _secs = parseFloat(String(secs).slice(0, -1));
        const unit = (_secs !== 1) ? "seconds" : "second";
        const prefix = (msg.length > 0) ? " and " : "";
        msg += prefix + _secs + " " + unit;
    }

    return msg;
};

var handlers = {
    'BookMeeting': function () {

        console.log("in BookMeeting");

        var roomName = this.event.request.intent.slots.room.value;
        var duration = this.event.request.intent.slots.duration.value;
        var day = this.event.request.intent.slots.day.value;
        var time = this.event.request.intent.slots.time.value;

        var msg = "If I understand correctly, you would like to book a meeting in room "+ roomName + " at " + time;
        msg += (duration) ? " for " + sayDuration(duration) : "";
        msg += (day) ? "on " + day : " today";
        msg += ", is this correct?";

        console.log(msg);

        this.response.speak(msg).cardRenderer("Meeting Scheduler", msg);

        // TODO wait for Yes/No response

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
        this.response.speak("You can try: 'alexa, hello world' or 'alexa, ask hello world my" +
            " name is awesome Aaron'");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'Unhandled' : function() {
        this.response.speak("Sorry, I didn't get that. You can try: 'alexa, hello world'" +
            " or 'alexa, ask hello world my name is awesome Aaron'");
    }
};
