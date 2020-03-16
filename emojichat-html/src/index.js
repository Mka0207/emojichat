import * as EmojiSearch from './emoji-search.js';
import * as PlayerNameSearch from './playername-search';
import { TextAnalyser } from './text-analyser.js';
import { colourToRGBA, byteLength, triggerEvent, convertEmoji, preProcessTextForOutput } from './utils.js';
import * as Suggestions from './component/suggestions.js';
import * as LuaOutput from './lua-output.js';
import * as InputState from './input-state.js';
import * as InputPrompt from './component/input-prompt.js';
import { Chatbox } from './chatbox.js';
import { State, SuggestionMode } from './state'

const MAX_INPUT_BYTES = 126;

var Keys = {
    Escape: 27,
    Tab: 9,
    Enter: 13,
    LeftArrow: 37,
    UpArrow: 38,
    RightArrow: 39,
    DownArrow: 40,
    SingleQuote: 39,
    BackTick: 96,
    AtSymbol: 64
};

function Init() {
    Chatbox.ScrollToBottom();
    InputPrompt.Reset();
    Suggestions.Reset();
    addOutput("[{\"colour\":{\"r\":0,\"g\":0,\"b\":0,\"a\":0},\"text\":\"\"}]") // Fixes weird clipping issue with first line of text
}


export function openURL(url) {
    LuaOutput.OpenURL(url);
}

export function insertEmoji(emojiCode) {
    PasteText(emojiCode);
}


// Input
export function setFadeTime(durationInSeconds) {
    State.FadeTimeSeconds = durationInSeconds;
}

export function setActive(destination, jsonPlayerList, jsonActivePlayer) {
    var playerList = JSON.parse(jsonPlayerList);
    var activePlayer = JSON.parse(jsonActivePlayer);

    State.Active = true;
    State.ActivePlayer = activePlayer;

    playerList.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
    State.PlayerList = playerList;

    InputPrompt.SetDestination(destination);
    InputPrompt.SetActivePlayerName(State.ActivePlayer.name);
    Chatbox.SetInputActive();
    State.SuggestionMode = SuggestionMode.None;
    Suggestions.Hide();

    var lines = document.getElementsByClassName("line");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line.classList.remove("inactive-line");
    }
}

export function setInactive() {
    State.Active = false;
    InputState.Reset();

    clearSelection();
    State.SuggestionMode = SuggestionMode.None;
    Suggestions.Hide();

    var lines = document.getElementsByClassName("faded-line");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line.classList.add("inactive-line");
    }

    Chatbox.ScrollToBottom();
    Chatbox.SetInputInactive();
}

export function addOutput(rawTextComponents) {
    var textComponents = JSON.parse(rawTextComponents);
    var formattedLine = "";

    for (var i = 0; i < textComponents.length; i++) {
        var component = textComponents[i];
        var colour = colourToRGBA(component.colour);
        var message = preProcessTextForOutput(component.text);
        formattedLine += "<span style=\"color: " + colour + "\">" + message + "</span>";
    }

    var id = "line-" + (State.CurrentLine++);
    Chatbox.OutputElement().innerHTML += "<div id='" + id + "' class='line'>" + formattedLine + "</div>";
    Chatbox.ScrollToBottom();
    fadeOutLine(id);
}


function clearSelection() {
    if (window.getSelection) { window.getSelection().removeAllRanges(); }
    else if (document.selection) { document.selection.empty(); }
}

function fadeOutLine(id) {
    setTimeout(function () {
        var element = document.getElementById(id)
        element.classList.add("faded-line");

        if (!State.Active)
            element.classList.add("inactive-line");
    }, State.FadeTimeSeconds * 1000);
}

function CompleteInProgressEmoji() {
    var inputBox = Chatbox.InputBoxElement();
    var inputEmojiStatus = TextAnalyser.FindInProgressEmoji(inputBox.value, inputBox.selectionStart);
    if (!inputEmojiStatus.inProgress) {
        return;
    }

    var emoji = ":" + Suggestions.GetSelectedSuggestion().name + ": ";

    var currentInput = inputBox.value;
    var firstHalf = currentInput.substring(0, inputEmojiStatus.startPos);
    var secondHalf = currentInput.substring(inputEmojiStatus.endPos + 1, currentInput.length)

    var newInput = firstHalf + emoji + secondHalf;
    var caretPosition = newInput.length - secondHalf.length;

    State.SuggestionMode = SuggestionMode.None;
    inputBox.value = newInput;
    inputBox.setSelectionRange(caretPosition, caretPosition);
    triggerEvent(inputBox, "input");
}

function CompleteInProgressPlayerName() {
    var inputBox = Chatbox.InputBoxElement();
    var status = TextAnalyser.FindInProgressPlayerName(inputBox.value, inputBox.selectionStart);
    if (!status.inProgress) {
        return;
    }

    var playerName = Suggestions.GetSelectedSuggestion().name + " ";

    var currentInput = inputBox.value;
    var firstHalf = currentInput.substring(0, status.startPos);
    var secondHalf = currentInput.substring(status.endPos + 1, currentInput.length)

    var newInput = firstHalf + playerName + secondHalf;
    var caretPosition = newInput.length - secondHalf.length;

    State.SuggestionMode = SuggestionMode.None;
    inputBox.value = newInput;
    inputBox.setSelectionRange(caretPosition, caretPosition);
    triggerEvent(inputBox, "input");
}


Chatbox.InputBoxElement()
    .addEventListener("keyup", function (event) {
        var key = event.which || event.keyCode || 0;
        if (key === Keys.Enter) {
            event.preventDefault();
            if (!InputState.ShouldIgnoreNextEnterRelease()) {
                LuaOutput.SendMessage(event.target.value, InputPrompt.GetSelectedDestination());
            }
            InputState.ConsumeEnterRelease();
        }
    });


document.getElementById("body")
    .addEventListener("keydown", function (event) {
        var key = event.which || event.keyCode || 0;

        if (key === Keys.Escape) {
            event.preventDefault();
            LuaOutput.CloseChat();
        }
    });

Chatbox.InputBoxElement()
    .addEventListener("click", function (event) {
        InputState.UpdateCaretPosition(event.target.selectionStart);
    });

Chatbox.InputBoxElement()
    .addEventListener("focus", function (event) {
        InputState.UpdateCaretPosition(event.target.selectionStart);
    });

Chatbox.InputBoxElement()
    .addEventListener("keypress", function (event) {
        var key = event.which || event.keyCode || 0;
        if (key === Keys.BackTick || key === Keys.SingleQuote || key === Keys.AtSymbol) {
            // https://github.com/Facepunch/garrysmod-issues/issues/1941
            LuaOutput.HideMenu()
        }
    });

Chatbox.InputBoxElement()
    .addEventListener("keydown", function (event) {
        var key = event.which || event.keyCode || 0;

        if (key === Keys.UpArrow) {
            event.preventDefault();
            if (Suggestions.AreActive()) {
                Suggestions.ChangeSelection(-1);
            }
        }
        else if (key === Keys.DownArrow) {
            event.preventDefault();
            if (Suggestions.AreActive()) {
                Suggestions.ChangeSelection(1);
            }
        }
        else {
            InputState.UpdateCaretPosition(event.target.selectionStart);
        }
    });

Chatbox.InputBoxElement()
    .addEventListener("paste", function (event) {
        event.preventDefault();
        event.stopPropagation();

        var paste = (event.clipboardData || window.clipboardData).getData('text');

        PasteText(paste);
    });

function PasteText(text) {
    var inputBox = Chatbox.InputBoxElement();
    var currentInput = inputBox.value;
    var selectionStart = inputBox.selectionStart;
    var selectionEnd = inputBox.selectionEnd;

    var firstHalf = currentInput.substring(0, selectionStart);
    var secondHalf = currentInput.substring(selectionEnd, currentInput.length);

    var newInput = firstHalf + text + secondHalf;
    var pasteWasTooLarge = false;
    while (byteLength(newInput) > MAX_INPUT_BYTES) {
        pasteWasTooLarge = true;

        text = text.substring(0, text.length - 1);
        newInput = firstHalf + text + secondHalf
    }

    if (pasteWasTooLarge)
        LuaOutput.PlayWarningSound();

    inputBox.value = newInput;
    var caretPosition = newInput.length - secondHalf.length;
    inputBox.setSelectionRange(caretPosition, caretPosition);
    triggerEvent(inputBox, "input");
}

Chatbox.InputBoxElement()
    .addEventListener("input", function (event) {
        if (!State.Active) return;

        var inputBox = event.target;
        var newInput = inputBox.value;

        if (byteLength(newInput) > MAX_INPUT_BYTES) {
            newInput = InputState.GetText();
            inputBox.value = newInput;
            inputBox.setSelectionRange(newInput.length, newInput.length);
            LuaOutput.PlayWarningSound();
            return;
        }

        InputState.SetText(newInput);

        if (State.SuggestionMode === SuggestionMode.PlayerName || State.SuggestionMode === SuggestionMode.None) {
            var inputPlayerNameStatus = TextAnalyser.FindInProgressPlayerName(inputBox.value, inputBox.selectionStart);
            if(inputPlayerNameStatus.inProgress) {
                var possiblePlayers = PlayerNameSearch.search(State.PlayerList, inputPlayerNameStatus.incompletePlayerName);

                if (possiblePlayers.length > 0) {
                    State.SuggestionMode = SuggestionMode.PlayerName;
                }
                else {
                    State.SuggestionMode = SuggestionMode.None;
                }
            }
            else {
                Suggestions.Hide();
                State.SuggestionMode = SuggestionMode.None;
            }
        }
        if (State.SuggestionMode === SuggestionMode.Emoji || State.SuggestionMode === SuggestionMode.None) {
            // When adding characters, awesomium incorrectly reports the current position to be 1 less than it actually is
            var inputEmojiStatus = TextAnalyser.FindInProgressEmoji(inputBox.value, inputBox.selectionStart);
            if (inputEmojiStatus.inProgress) {
                var possibleEmojis = EmojiSearch.search(inputEmojiStatus.incompleteEmojiCode);

                if (possibleEmojis.length > 0) {
                    State.SuggestionMode = SuggestionMode.Emoji;
                }
                else {
                    State.SuggestionMode = SuggestionMode.None;
                }
            }
            else {
                Suggestions.Hide();
                State.SuggestionMode = SuggestionMode.None;
            }
        }

        LuaOutput.InputChangeCallback(newInput);
    });


Init();
