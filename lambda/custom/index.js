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

const API_HOST = "meeting-scheduler.us-east-1.elasticbeanstalk.com";
const API_BASE = "http://"+API_HOST;

const participants = [];

let organizerEmail = null;
let participantOneEmail = null;
let participantTwoEmail = null;
let participantThreeEmail = null;

let assignedOrganizer = false;
let doneWithParticipants = false;
let invitingParticipant = false;
let awaitingResponseOnSuggestingMeetingTimes = false;
let roomSuggestions = [];

const welcomeOutput = "Let's book a meeting.  What meeting would you like to book?";
const welcomeReprompt = "Let me know about the meeting you would like to schedule.";

var handlers = {

    'LaunchRequest': function () {
        console.log("in LaunchRequest");
        this.response.speak(welcomeOutput).listen(welcomeReprompt);
        this.emit(':responseReady');
    },

    'QuickBookMeeting': function () {

        console.log("in QuickBookMeeting");

        const filledSlots = delegateSlotCollection.call(this);

        const meetingRoom = this.event.request.intent.slots.meetingRoom.value;
        const duration = this.event.request.intent.slots.meetingDuration.value;
        const day = this.event.request.intent.slots.meetingDay.value;
        const startTime = this.event.request.intent.slots.meetingStartTime.value;

        if(this.event.request.intent.confirmationStatus === "DENIED") {

            this.response.speak('Bye');
            this.emit(':responseReady');

        } else if (this.event.request.intent.confirmationStatus === "CONFIRMED") {

            const startDateTime = getDateTime(day, startTime);
            const endDateTime = getEndDateTime(startDateTime, duration);

            const users = getParticipantEmails();
            const names = getParticipants(this.event.request.intent);
            const meetingName = sayArray(names, 'and')+" Meeting";

            const meetingInfo = {
                name: meetingName,
                startDateTime: startDateTime.format(),
                endDateTime: endDateTime.format(),
                participants: users,
                room: meetingRoom
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

    'BookMeeting': function () {

        console.log("in BookMeeting");

        const filledSlots = delegateSlotCollection.call(this);

        const meetingName = this.event.request.intent.slots.meetingName.value;
        const roomName = this.event.request.intent.slots.meetingRoom.value;
        const duration = this.event.request.intent.slots.meetingDuration.value;
        const day = this.event.request.intent.slots.meetingDay.value;
        const startTime = this.event.request.intent.slots.startTime.value;

        const organizerEmail = this.event.request.intent.slots.organizerEmail.value;

        if(this.event.request.intent.confirmationStatus === "DENIED") {
            this.response.speak('Bye');
            this.emit(':responseReady');

        } else if (this.event.request.intent.confirmationStatus === "CONFIRMED") {

            const startDateTime = getDateTime(day, startTime);
            const endDateTime = getEndDateTime(startDateTime, duration);
            const users = [organizerEmail].concat(participants);

            const meetingInfo = {
                name: meetingName,
                startDateTime: startDateTime.format(),
                endDateTime: endDateTime.format(),
                participants: users,
                room: roomName
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

    const intentName = this.event.request.intent.name;

    console.log(intentName, this.event.request.dialogState);
    console.log(this.event.request.intent);

    if(this.event.request.dialogState === "STARTED") {

        let updatedIntent = this.event.request.intent;

        if(intentName === "BookMeeting") {

            if (!updatedIntent.slots.participant.value) {
                updatedIntent.slots.participant.value = "";
            }

            // default to meeting today
            if (!updatedIntent.slots.meetingDay.value) {
                updatedIntent.slots.meetingDay.value = moment().format("YYYY-MM-DD");
            }

            // default to 1-hour meeting
            if (!updatedIntent.slots.meetingDuration.value) {
                updatedIntent.slots.meetingDuration.value = "PT1H";
            }

            updatedIntent.slots.prettyDuration.value = prettifyDuration(updatedIntent.slots.meetingDuration.value);

            this.emit(":delegate", updatedIntent);

        } else if(intentName === "QuickBookMeeting") {

            const organizerSlot = updatedIntent.slots.organizer;
            const participantOneSlot = updatedIntent.slots.participantOne;
            const participantTwoSlot = updatedIntent.slots.participantTwo;
            const participantThreeSlot = updatedIntent.slots.participantThree;

            const meetingStartTimeSlot = updatedIntent.slots.meetingStartTime;
            const meetingRoomSlot = updatedIntent.slots.meetingRoom;
            const meetingDaySlot = updatedIntent.slots.meetingDay;

            const prettyDurationSlot = updatedIntent.slots.prettyDuration;

            // default to 1-hour meeting
            if (!updatedIntent.slots.meetingDuration.value) {
                updatedIntent.slots.meetingDuration.value = "PT1H";
                updatedIntent.slots.prettyDuration.value = prettifyDuration("PT1H");
            }

            if (organizerSlot.value) {

                request.get({
                    method: 'GET',
                    uri: API_BASE + "/api/users",
                    qs: {
                        givenName: organizerSlot.value
                    },
                    json: true
                }, (error, response, body) => {

                    if (response.statusCode === 200 && body.items.length > 0) {

                        organizerSlot.value = body.items[0].givenName + " " + body.items[0].familyName;
                        organizerEmail = body.items[0].email;

                        if(participantOneSlot.value) {

                            request.get({
                                method: 'GET',
                                uri: API_BASE + "/api/users",
                                qs: {
                                    givenName: participantOneSlot.value
                                },
                                json: true
                            }, (error, response, body) => {

                                if (response.statusCode === 200 && body.items.length > 0) {

                                    participantOneSlot.value = body.items[0].givenName + " " + body.items[0].familyName;
                                    participantOneEmail = body.items[0].email;

                                    if(participantTwoSlot.value) {

                                        request.get({
                                            method: 'GET',
                                            uri: API_BASE + "/api/users",
                                            qs: {
                                                givenName: participantTwoSlot.value
                                            },
                                            json: true
                                        }, (error, response, body) => {

                                            if (response.statusCode === 200 && body.items.length > 0) {

                                                participantTwoSlot.value = body.items[0].givenName + " " + body.items[0].familyName;
                                                participantTwoEmail = body.items[0].email;

                                                if(participantThreeSlot.value) {

                                                    request.get({
                                                        method: 'GET',
                                                        uri: API_BASE + "/api/users",
                                                        qs: {
                                                            givenName: participantThreeSlot.value
                                                        },
                                                        json: true
                                                    }, (error, response, body) => {

                                                        if (response.statusCode === 200 && body.items.length > 0) {

                                                            participantThreeSlot.value = body.items[0].givenName + " " + body.items[0].familyName;
                                                            participantThreeEmail = body.items[0].email;

                                                            // no more participants to check
                                                            // get meeting suggestions

                                                            request.post({
                                                                method: 'POST',
                                                                uri: API_BASE + "/api/meetingSuggestion",
                                                                body: {participants: getParticipantEmails()},
                                                                json: true
                                                            }, (error, response, body) => {

                                                                if (response.statusCode === 200 && body.suggestions.length > 0) {

                                                                    const startDateTime = moment(body.suggestions[0].startDateTime);

                                                                    meetingStartTimeSlot.value = startDateTime.format("HH:mm");
                                                                    meetingDaySlot.value = startDateTime.format("YYYY-MM-DD");
                                                                    meetingRoomSlot.value = body.suggestions[0].rooms[0];

                                                                    let userNames = getParticipants(updatedIntent);

                                                                    let msg = 'I am ready to book a meeting in room '+ meetingRoomSlot.value
                                                                        + ' on <say-as interpret-as="date">' + meetingDaySlot.value
                                                                        + '</say-as> at <say-as interpret-as="time">' + meetingStartTimeSlot.value
                                                                        + '</say-as> for ' + prettyDurationSlot.value + ' with '
                                                                        + sayArray(userNames, 'and') + '. Is that Ok';

                                                                    this.emit(':confirmIntent', msg, msg, updatedIntent);

                                                                } else {
                                                                    console.log("something went wrong getting meeting suggestions");
                                                                    this.emit(":delegate", updatedIntent);
                                                                }

                                                            });

                                                        } else {
                                                            console.log("something went wrong getting participantThree");
                                                            this.emit(":delegate", updatedIntent);
                                                        }

                                                    });

                                                } else {

                                                    // no other participants, get meeting suggestions

                                                    request.post({
                                                        method: 'POST',
                                                        uri: API_BASE + "/api/meetingSuggestion",
                                                        body: {participants: getParticipantEmails()},
                                                        json: true
                                                    }, (error, response, body) => {

                                                        if (response.statusCode === 200 && body.suggestions.length > 0) {

                                                            const startDateTime = moment(body.suggestions[0].startDateTime);

                                                            meetingStartTimeSlot.value = startDateTime.format("HH:mm");
                                                            meetingDaySlot.value = startDateTime.format("YYYY-MM-DD");
                                                            meetingRoomSlot.value = body.suggestions[0].rooms[0];

                                                            let userNames = getParticipants(updatedIntent);

                                                            let msg = 'I am ready to book a meeting in room '+ meetingRoomSlot.value
                                                                + ' on <say-as interpret-as="date">' + meetingDaySlot.value
                                                                + '</say-as> at <say-as interpret-as="time">' + meetingStartTimeSlot.value
                                                                + '</say-as> for ' + prettyDurationSlot.value + ' with '
                                                                + sayArray(userNames, 'and') + '. Is that Ok';

                                                            this.emit(':confirmIntent', msg, msg, updatedIntent);

                                                        } else {
                                                            console.log("something went wrong getting meeting suggestions");
                                                            this.emit(":delegate", updatedIntent);
                                                        }

                                                    });
                                                }

                                            } else {
                                                console.log("something went wrong getting participantTwo");
                                                this.emit(":delegate", updatedIntent);
                                            }
                                        });

                                    } else {

                                        // no other participants, get meeting suggestions

                                        request.post({
                                            method: 'POST',
                                            uri: API_BASE + "/api/meetingSuggestion",
                                            body: {participants: getParticipantEmails()},
                                            json: true
                                        }, (error, response, body) => {

                                            if (response.statusCode === 200 && body.suggestions.length > 0) {

                                                const startDateTime = moment(body.suggestions[0].startDateTime);

                                                meetingStartTimeSlot.value = startDateTime.format("HH:mm");
                                                meetingDaySlot.value = startDateTime.format("YYYY-MM-DD");
                                                meetingRoomSlot.value = body.suggestions[0].rooms[0];

                                                let userNames = getParticipants(updatedIntent);

                                                let msg = 'I am ready to book a meeting in room '+ meetingRoomSlot.value
                                                    + ' on <say-as interpret-as="date">' + meetingDaySlot.value
                                                    + '</say-as> at <say-as interpret-as="time">' + meetingStartTimeSlot.value
                                                    + '</say-as> for ' + prettyDurationSlot.value + ' with '
                                                    + sayArray(userNames, 'and') + '. Is that Ok';

                                                this.emit(':confirmIntent', msg, msg, updatedIntent);

                                            } else {
                                                console.log("something went wrong getting meeting suggestions");
                                                this.emit(":delegate", updatedIntent);
                                            }

                                        });
                                    }

                                } else {
                                    console.log("something went wrong getting participantOne");
                                    this.emit(":delegate", updatedIntent);
                                }
                            });

                        } else {

                            // no other participants, get meeting suggestions

                            request.post({
                                method: 'POST',
                                uri: API_BASE + "/api/meetingSuggestion",
                                body: {participants: getParticipantEmails()},
                                json: true
                            }, (error, response, body) => {

                                if (response.statusCode === 200 && body.suggestions.length > 0) {

                                    const startDateTime = moment(body.suggestions[0].startDateTime);

                                    meetingStartTimeSlot.value = startDateTime.format("HH:mm");
                                    meetingDaySlot.value = startDateTime.format("YYYY-MM-DD");
                                    meetingRoomSlot.value = body.suggestions[0].rooms[0];

                                    let userNames = getParticipants(updatedIntent);

                                    let msg = 'I am ready to book a meeting in room '+ meetingRoomSlot.value
                                        + ' on <say-as interpret-as="date">' + meetingDaySlot.value
                                        + '</say-as> at <say-as interpret-as="time">' + meetingStartTimeSlot.value
                                        + '</say-as> for ' + prettyDurationSlot.value + ' with '
                                        + sayArray(userNames, 'and') + '. Is that Ok';

                                    this.emit(':confirmIntent', msg, msg, updatedIntent);

                                } else {
                                    console.log("something went wrong getting meeting suggestions");
                                    this.emit(":delegate", updatedIntent);
                                }

                            });
                        }
                    } else {
                        console.log("something went wrong getting organizer");
                        this.emit(":delegate", updatedIntent);
                    }
                });

            }
        }

    } else if(this.event.request.dialogState !== "COMPLETED") {

        console.log(this.event.request.intent.slots);

        if(intentName === "BookMeeting") {

            let updatedIntent = this.event.request.intent;
            const organizerSlot = updatedIntent.slots.organizer;
            const participantSlot = updatedIntent.slots.participant;
            const participantEmail = updatedIntent.slots.participantEmail;
            const addParticipant = updatedIntent.slots.addParticipant;
            const suggestMeetingTime = updatedIntent.slots.suggestMeetingTime;
            const meetingRoomSlot = updatedIntent.slots.meetingRoom;

            if (participantSlot.value
                && doneWithParticipants === false
                && invitingParticipant === true
                && participantSlot.value !== ""
                && participantSlot.confirmationStatus === "CONFIRMED") {

                participants.push(participantEmail.value);
                participantSlot.value = "";
                invitingParticipant = false;

                let prompt = "Would you like to invite anyone else to the meeting?";
                let reprompt = "Would you like to invite anyone else to the meeting?";
                this.emit(':elicitSlot', 'addParticipant', prompt, reprompt);

            } else if (suggestMeetingTime.value
                && awaitingResponseOnSuggestingMeetingTimes === true) {

                awaitingResponseOnSuggestingMeetingTimes = false;

                if (suggestMeetingTime.value.toLowerCase() === "yes") {

                    const organizerEmail = updatedIntent.slots.organizerEmail.value;
                    const users = [organizerEmail].concat(participants);

                    request.post({
                        method: 'POST',
                        uri: API_BASE + "/api/meetingSuggestion",
                        body: {participants: users},
                        json: true
                    }, (error, response, body) => {

                        if (response.statusCode === 200 && body.suggestions.length > 0) {
                            roomSuggestions = body.suggestions;

                            // TODO read off meeting time suggestions ... listen for response

                            const startTimeOptions = roomSuggestions.map(s => prettifyDateTime(s.startDateTime));

                            const msg = sayArray(startTimeOptions, 'or');
                            let prompt = "Would you like to meet at " + msg;
                            let reprompt = "Would you like to meet at " + msg;
                            this.emit(':elicitSlot', 'startTime', prompt, reprompt);

                        } else {

                            let prompt = "I am sorry, no meeting time options for all participants are available in the next few hours.";
                            prompt += " Would you like to specify a time directly?";
                            let reprompt = "When would you like to schedule the meeting for?";
                            this.emit(':elicitSlot', 'startTime', prompt, reprompt);
                        }

                    });

                } else {
                    // should default to asking user what time they want to meet
                    this.emit(":delegate", updatedIntent);
                }

                awaitingResponseOnSuggestingMeetingTimes = false;

            } else if (addParticipant.value
                && invitingParticipant === false
                && doneWithParticipants === false) {

                if (addParticipant.value
                    && addParticipant.value.toLowerCase() === "yes") {
                    invitingParticipant = true;
                    let prompt = "Who would you like to invite?";
                    let reprompt = "Who else would you like to invite to the meeting?";
                    this.emit(':elicitSlot', 'participant', prompt, reprompt);

                } else {
                    doneWithParticipants = true;
                    awaitingResponseOnSuggestingMeetingTimes = true;
                    let prompt = "Would you like to hear options for meeting times?";
                    let reprompt = "Would you like me to list options for meeting times?";
                    this.emit(':elicitSlot', 'suggestMeetingTime', prompt, reprompt);
                    //this.emit(":delegate", updatedIntent);
                }

            } else if (meetingRoomSlot.value && meetingRoomSlot.confirmationStatus === "NONE") {

                request.get({
                    method: 'GET',
                    uri: API_BASE + "/api/rooms",
                    qs: {
                        nameContains: meetingRoomSlot.value
                    },
                    json: true
                }, (error, response, body) => {

                    if (response.statusCode === 200 && body.items.length > 0) {
                        meetingRoomSlot.value = body.items[0].name;
                    } else {
                        meetingRoomSlot.value = null;
                    }

                    this.emit(":delegate", updatedIntent);

                });

            } else if (participantSlot.value
                && doneWithParticipants === false
                && invitingParticipant === true
                && participantSlot.confirmationStatus === "NONE") {

                request.get({
                    method: 'GET',
                    uri: API_BASE + "/api/users",
                    qs: {
                        givenName: participantSlot.value
                    },
                    json: true
                }, (error, response, body) => {

                    if (response.statusCode === 200 && body.items.length > 0) {
                        updatedIntent.slots.participant.value = body.items[0].givenName + " " + body.items[0].familyName;
                        updatedIntent.slots.participantEmail.value = body.items[0].email;

                    } else {
                        updatedIntent.slots.participantEmail.value = "unknown";
                    }

                    this.emit(":delegate", updatedIntent);

                });

            } else if (organizerSlot.value
                && assignedOrganizer === false
                && organizerSlot.confirmationStatus === "CONFIRMED") {

                // set to null so dialog will ask user if they want to include participants
                participantSlot.value = null;

                assignedOrganizer = true;
                invitingParticipant = false;

                //this.emit(":delegate", updatedIntent);
                let prompt = "Would you like to invite anyone else to the meeting?";
                let reprompt = "Would you like to invite anyone else to the meeting?";
                this.emit(':elicitSlot', 'addParticipant', prompt, reprompt);

            } else if (organizerSlot.value
                && organizerSlot.confirmationStatus === "NONE") {

                request.get({
                    method: 'GET',
                    uri: API_BASE + "/api/users",
                    qs: {
                        givenName: organizerSlot.value
                    },
                    json: true
                }, (error, response, body) => {

                    if (response.statusCode === 200 && body.items.length > 0) {
                        updatedIntent.slots.organizer.value = body.items[0].givenName + " " + body.items[0].familyName;
                        updatedIntent.slots.organizerEmail.value = body.items[0].email;
                    } else {
                        updatedIntent.slots.organizerEmail.value = "unknown";
                    }

                    this.emit(":delegate", updatedIntent);

                });

            } else {
                this.emit(":delegate");
            }
        }

    } else {

        let updatedIntent = this.event.request.intent;

        if(updatedIntent.slots.meetingDuration.value) {
            // update prettyDuration with prettified meetingDuration value for speech back to user in meeting confirmation
            const prettyDuration = prettifyDuration(updatedIntent.slots.meetingDuration.value);
            updatedIntent.slots.prettyDuration.value = prettyDuration;
        }

        return updatedIntent;
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

const prettifyDateTime = function (datetime) {
    return moment(datetime).format("dddd, Hma");
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

function sayArray(myData, penultimateWord = 'and') {
    // the first argument is an array [] of items
    // the second argument is the list penultimate word; and/or/nor etc.  Default to 'and'
    let result = '';

    myData.forEach(function(element, index, arr) {

        if (index === 0) {
            result = element;
        } else if (index === myData.length - 1) {
            result += ` ${penultimateWord} ${element}`;
        } else {
            result += `, ${element}`;
        }
    });
    return result;
}

function getParticipants(intent) {
    let users = [intent.slots.organizer.value];
    if(intent.slots.participantOne.value) { users.push(intent.slots.participantOne.value); }
    if(intent.slots.participantTwo.value) { users.push(intent.slots.participantTwo.value); }
    if(intent.slots.participantThree.value) { users.push(intent.slots.participantThree.value); }
    return users;
}

function getParticipantEmails() {
    let emails = [organizerEmail];
    if(participantOneEmail) { emails.push(participantOneEmail); }
    if(participantTwoEmail) { emails.push(participantTwoEmail); }
    if(participantThreeEmail) { emails.push(participantThreeEmail); }
    return emails;
}