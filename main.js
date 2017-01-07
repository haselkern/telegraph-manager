// Prevent multiple load events when scrolling
var canLoadMore = false;

// Load batches of pages of this size
var numberOfPagesToLoad = 10;

// How many pixels should there be space around the FAB
var fabSpace = 30;

$(document).ready(function(){

    // Check for localStorage
    if (typeof(Storage) !== "undefined") {
        // Storage support present, login
        login();
    }

    // Window scroll for loading more pages
    window.onscroll = function(){
        // Trigger loading of more pages when there are still cards to scroll
        var triggerElement = $(".card:nth-last-child("+numberOfPagesToLoad+")");

        if(isScrolledIntoView(triggerElement)){
            if(canLoadMore){
                canLoadMore = false;
                loadPages();
            }
        }
    }

    // Window resize for positioning FAB
    window.onresize = resize;
    resize();

});

function resize(){
    var fab = $("#fab");
    var screenWidth = $(".screen:visible").width();

    var left = ($(window).width() - screenWidth)/2 + screenWidth - fab.width() - fabSpace;

    fab.css("bottom", fabSpace);
    fab.css("left", left);
}

// http://stackoverflow.com/a/488073/1456971
function isScrolledIntoView(elem) {
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();

    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

function showScreen(name){
    // Hide all other screens
    $("[id^=screen-]").hide();
    // Show desired screen
    $("#screen-"+name).show();

    // Show/hide hero for certain screen names
    var heroVisible = name == "login" || name == "nosupport";
    if(heroVisible){
        $("#hero").show();
    }
    else{
        $("#hero").hide();
    }
}

// Check for existing access token and login or show login screen
function login(){
    if(localStorage.token){
        main();
    }
    else{
        // Show login screen
        showScreen("login");
    }
}

function createAccount(){
    // Attributes
    var author_name = $("input[name='author_name']").val();
    var short_name = $("input[name='short_name']").val();
    var author_url = $("input[name='author_url']").val();

    // Request token
    $.getJSON("https://api.telegra.ph/createAccount", {
        "author_name": author_name,
        "short_name": short_name,
        "author_url": author_url
    }, function(data){

        // Check for valid data
        if(!data.ok){
            alert(data.error);
            return;
        }
        
        // Store token
        localStorage.token = data.result.access_token;

        // handle login link
        $("#screen-login-telegraph a").attr("href", data.result.auth_url);
        showScreen("login-telegraph");

    });
}

// Login with provided token, this requires generating a new one
function tokenLogin(){
    var token = $("input[name='token']").val();
    
    $.getJSON("https://api.telegra.ph/revokeAccessToken", {
        "access_token": token
    }, function(data){

        // Check for valid data
        if(!data.ok){
            alert(data.error);
            return;
        }
        
        // Store new token
        localStorage.token = data.result.access_token;

        // handle login link
        $("#screen-login-telegraph a").attr("href", data.result.auth_url);
        showScreen("login-telegraph");

    });

}

// User has clicked the telegraph authorization link
function doneAuthorized(){
    main();
}

// Shows the main screen
function main(){
    showScreen("main");

    // Load user info
    $.getJSON("https://api.telegra.ph/getAccountInfo", {
        "access_token": localStorage.token
    }, function(data){
        
        // Show login screen for errors
        if(!data.ok){
            showScreen("login");
        }

        // Username might be empty
        var username = data.result.author_name;
        if(username == "") username = "<unkown>";
        
        $("#user-name").text(username);
        $("#user-short").text(data.result.short_name);

        // Hide user url if it is not provided
        $("#user-url").toggle(data.result.author_url != "");
        $("#user-url").text(data.result.author_url);
        $("#user-url").attr("href", data.result.author_url);

    });

    // Clear old pages
    $("#page-list").empty();

    // Load pages
    loadPages();

}

// Loads more pages
function loadPages(){

    var pageList = $("#page-list");

    $.getJSON("https://api.telegra.ph/getPageList", {
        "access_token": localStorage.token,
        "offset" : pageList.children().length,
        "limit" : numberOfPagesToLoad
    }, function(data){
        
        // Set page text
        var s = data.result.total_count == 1 ? "" : "s";
        $("#user-page-count").text(data.result.total_count + " page" + s);

        // Check for valid data
        if(!data.ok){
            alert(data.error);
            return;
        }

        // Append new pages
        $.each(data.result.pages, function(){

            // Should the text read 'view' or 'views'
            var s = this.views == 1 ? "" : "s";
            
            pageList.append("<a class='card' href='"+this.url+"' target='_blank'><h1>"+this.title+"</h1><p>"+this.views+" view"+s+"</p><p>"+this.description+"</p></a>");

        });

        // If we got many pages, we can load more
        if(data.result.pages.length == numberOfPagesToLoad){
            // We can now receive another load event
            canLoadMore = true;
        }

    });
}

// Show edit screen for user profile
function edit(){

    // Populate edit fields
    $("#logout-token").text(localStorage.token);

    $.getJSON("https://api.telegra.ph/getAccountInfo", {
        "access_token": localStorage.token
    }, function(data){
        
        // Check for valid data
        if(!data.ok){
            alert(data.error);
            return;
        }
        
        $("input[name='author_name_edit']").val(data.result.author_name);
        $("input[name='short_name_edit']").val(data.result.short_name);
        $("input[name='author_url_edit']").val(data.result.author_url);

        showScreen("edit");

    });

}

// Save edited profile
function saveEdit(){

    $.getJSON("https://api.telegra.ph/editAccountInfo", {
        "access_token": localStorage.token,
        "author_name": $("input[name='author_name_edit']").val(),
        "short_name": $("input[name='short_name_edit']").val(),
        "author_url": $("input[name='author_url_edit']").val(),
    }, function(data){
        
        // Check for valid data
        if(!data.ok){
            alert(data.error);
            return;
        }
        
        main();

    });

}

// logout
function logout(){
    localStorage.removeItem("token");
    window.location.reload(true);
}