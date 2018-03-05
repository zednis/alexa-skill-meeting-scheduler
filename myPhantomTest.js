console.log("test");
for (var i = 0; i < 1000; i++) {
    // for loop to make the build sleep for a bit, don't ask why
    if (true) {
        continue;
    } else {
        console.log("uh oh");
    }
}
console.log("\n");
var system = require('system');
var env = system.env;
var ASK_EMAIL = "None";
var ASK_PW = "None";
ASK_EMAIL = env["ASK_EMAIL"];
ASK_PW = env["ASK_PW"];
console.log("ask pw");
console.log(ASK_PW);


var page = new WebPage(), testindex = 0, loadInProgress = false;
page.settings.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:44.0) Gecko/20100101 Firefox/44.0";

page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.onLoadStarted = function() {
    loadInProgress = true;
    console.log("load started");
};

page.onLoadFinished = function() {
    loadInProgress = false;
    console.log("load finished");
};

var steps = [
    function() {
        //Load Login Page
        var url = "https://www.amazon.com/ap/oa?response_type=code&client_id=amzn1.application-oa2-client.aad322b5faab44b980c8f87f94fbac56&redirect_uri=https%3A%2F%2Fs3.amazonaws.com%2Fask-cli%2Fresponse_parser.html&scope=alexa%3A%3Aask%3Askills%3Areadwrite%20alexa%3A%3Aask%3Amodels%3Areadwrite%20alexa%3A%3Aask%3Askills%3Atest&state=Ask-SkillModel-ReadWrite";
        page.open(url);
    },
    function(email, password) {
        //Enter Credentials
        page.evaluate(function(ask_email, ask_password) {
            var form = document.getElementById('ap_signin_form');
            console.log("logging in");
            console.log(ask_email);
            console.log(ask_password);
            form.elements["email"].value = ask_email;
            form.elements["password"].value = ask_password;
            return;
        }, email, password);
    },
    function() {
        //Login
        page.evaluate(function() {
            var populatedForm = document.getElementById('ap_signin_form');
            populatedForm.submit()
            return;
        });
    },
    function() {
        // Output content of page to stdout after form has been submitted
        page.evaluate(function() {
            // var markup = document.getElementById('header-bottom-right').textContent;
            var inner = document.documentElement.innerHTML;
            var outer = document.documentElement.outerHTML;
            console.log(inner);
            console.log(outer);
        });
    }
];



interval = setInterval(function() {
    if (!loadInProgress && typeof steps[testindex] == "function") {
        if (testindex != 1) {
            steps[testindex]();
        }
        else {
            steps[testindex](ASK_EMAIL, ASK_PW);
        }
        testindex++;
    }
    if (typeof steps[testindex] != "function") {
        // console.log("test complete!");
        console.log(phantom.cookiesEnabled);
        phantom.exit();
    }
}, 50);