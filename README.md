# alexa-skill-meeting-scheduler

Alexa Meeting Scheduler

# Overview

This alexa skill allows users describe and schedule work meetings via voice interaction with an Alexa-enabled device.

Currently the skill supports two separate interactions - a basic dialog mode which guides the user into providing all
information fully describing a meeting and a 'quick book' mode where the skill will suggest a meeting time and
room based on a request to create a meeting the next time a group of listed participants are all available.

A more detailed description of the two Alexa skill interaction modes is available in the [User Guide](USER-GUIDE.md)

# Interaction model

TODO

## Custom Slots

TODO

# Code Structure

The skill code is contained in the lambda/custom/index.js file and structured according to AWS Alexa skill conventions.

The BookMeeting and QuickBookMeeting intents are defined as handler functions and both utilize a Dialog state
with optional and required slots and a user confirmation before the handler completes the creation of the meeting.

The delegateSlotCollection function is implement functionality as a response to changes in dialog state.  When a user
responds to a slot prompt or slot confirmation the delegateSlotCollection function is invoked and a large conditional
statement is used to determine what action to take.  When all required slots have been filled and Alexa has asked the e

# Deploying

This alexa skill may be deployed to AWS using the [ASK CLI](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html)

Instructions for installing, configuring the ASK CLI are available in the Alexa Skills [Quick Start](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html#step-2-install-and-initialize-ask-cli)

To deploy the current code to AWS run ``ask deploy``.
