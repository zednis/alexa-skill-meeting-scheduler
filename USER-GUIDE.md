# User Guide

This alexa skill allows users describe and schedule work meetings via voice interaction with an Alexa-enabled device.

Currently the skill supports two separate interactions - a basic dialog mode which guides the user into providing all
information fully describing a meeting and a 'quick book' mode where the skill will suggest a meeting time and
room based on a group of listed participants.

In both modes the skill will ask for confirmation before scheduling the meeting.

## Book Meeting - Basic Dialog

The Book Meeting Basic Dialog will prompt the user for meeting information, including name, organizer, participants,
room, and start datetime.  The user may optionally include a duration when they are providing the meeting start time,
but if they do not a default meeting time of 1-hour will be used.

User: *Alexa, ask meeting scheduler to schedule a meeting*
Alexa: *Ok. What would you like to call the meeting?*
User: *Demo*
Alexa: *Who should I set as meeting organizer?*
User: *Stephan*
Alexa: *Did you mean Stephan Zednik with email zednis@rpi.edu?*
User: *Yes*
Alexa: *Would you like to invite anyone else to the meeting?*
User: *Yes*
Alexa: *Who would you like to invite to the meeting?*
User: *Max*
Alexa: *Did you mean Max Wang with email wangm13@rpi.edu?*
User: *Yes*
Alexa: *Would you like to invite anyone else to the meeting?*
User: *No*
Alexa: *Would you like to hear a list of available meeting times?*
User: *Yes*
Alexa: *...*


## Quick Book Meeting

The 'quick book meeting' command is a shorter dialog where the user asks the system to suggest a room and start time
for a meeting comprised of a list of participants.  The first named participant will be treated as the meeting organizer.

The skill will use as the suggested meeting time the first available 1-hour timeslot during work hours (weekdays, 7AM-5PM)
where all participants are available.

examples:

User: *Alexa, ask meeting scheduler to book a room the next time Stephan and Max are available*
Alexa: *I am ready to book a meeting for Stephan Zednik and Max Wang in room 'Longs Peak' at ...*
User: *Yes*

The user may optionally specify meeting room resources that should be present for the suggested meeting room.

User: *Alexa, ask meeting scheduler to book a room with a whiteboard the next time Stephan and Max are available*
Alexa: *I am ready to book a meeting for Stephan Zednik and Max Wang in room 'Pikes Peak' at ...*
User: *Yes*