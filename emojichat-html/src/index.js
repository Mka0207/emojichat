import { search } from './emoji-search.js';
import { TextAnalyser } from './text-analyser.js';
import { replaceEmojisInText, colourToRGBA, byteLength, triggerEvent } from './utils.js';
import * as EmojiSuggestions from './component/emoji-suggestions.js';
import * as LuaOutput from './lua-output.js';
import * as InputState from './input-state.js';
import * as InputPrompt from './component/input-prompt.js';
import { Chatbox } from './chatbox.js';
import { State } from './state'

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
    EmojiSuggestions.Reset();
    addOutput("[{\"colour\":{\"r\":0,\"g\":0,\"b\":0,\"a\":0},\"text\":\"\"}]") // Fixes weird clipping issue with first line of text
}



// Input
export function setFadeTime(durationInSeconds) {
    State.FadeTimeSeconds = durationInSeconds;
}

export function setPlayerList(players) {
    State.PlayerList = players;
}

export function setActive(destination) {
    State.Active = true;

    InputPrompt.SetDestination(destination);
    Chatbox.SetInputActive();
    EmojiSuggestions.Hide();

    var lines = document.getElementsByClassName("line");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line.classList.remove("inactive-line");
    }
}

export function setInactive() {
    State.Active = false;
    InputState.Reset();

    Chatbox.SetInputInactive();
    clearSelection();
    EmojiSuggestions.Hide();

    var lines = document.getElementsByClassName("faded-line");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line.classList.add("inactive-line");
    }

    Chatbox.ScrollToBottom();
}

export function addOutput(rawTextComponents) {
    var textComponents = JSON.parse(rawTextComponents);
    var formattedLine = "";

    for (var i = 0; i < textComponents.length; i++) {
        var component = textComponents[i];
        var colour = colourToRGBA(component.colour);
        var message = replaceEmojisInText(_.escape(component.text));
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

    var emoji = EmojiSuggestions.GetSelectedEmoji();

    var currentInput = inputBox.value;
    var firstHalf = currentInput.substring(0, inputEmojiStatus.startPos);
    var secondHalf = currentInput.substring(inputEmojiStatus.endPos + 1, currentInput.length)

    var newInput = firstHalf + emoji + secondHalf;
    var caretPosition = newInput.length - secondHalf.length;

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

        if (key === Keys.Tab) {
            event.preventDefault();
            if (EmojiSuggestions.AreActive()) {
                CompleteInProgressEmoji();
            }
            else {
                InputPrompt.SelectNextDestination();
            }
        }
        else if (key === Keys.UpArrow) {
            event.preventDefault();
            if (EmojiSuggestions.AreActive()) {
                EmojiSuggestions.ChangeSelection(-1);
            }
        }
        else if (key === Keys.DownArrow) {
            event.preventDefault();
            if (EmojiSuggestions.AreActive()) {
                EmojiSuggestions.ChangeSelection(1);
            }
        }
        else if (key === Keys.Enter) {
            if (EmojiSuggestions.AreActive()) {
                InputState.IgnoreNextEnterRelease();
                CompleteInProgressEmoji();
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

        var inputBox = event.target;
        var currentInput = inputBox.value;
        var selectionStart = inputBox.selectionStart;
        var selectionEnd = inputBox.selectionEnd;

        var firstHalf = currentInput.substring(0, selectionStart);
        var secondHalf = currentInput.substring(selectionEnd, currentInput.length);

        var newInput = firstHalf + paste + secondHalf;
        var pasteWasTooLarge = false;
        while (byteLength(newInput) > MAX_INPUT_BYTES) {
            pasteWasTooLarge = true;

            paste = paste.substring(0, paste.length - 1);
            newInput = firstHalf + paste + secondHalf
        }

        if (pasteWasTooLarge)
            LuaOutput.PlayWarningSound();

        inputBox.value = newInput;
        var caretPosition = newInput.length - secondHalf.length;
        inputBox.setSelectionRange(caretPosition, caretPosition);
        triggerEvent(inputBox, "input");
    });

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

        // When adding characters, awesomium incorrectly reports the current position to be 1 less than it actually is
        var inputEmojiStatus = TextAnalyser.FindInProgressEmoji(inputBox.value, inputBox.selectionStart);
        if (inputEmojiStatus.inProgress) {
            var possibleEmojis = search(inputEmojiStatus.incompleteEmojiCode);

            if (possibleEmojis.length > 0) {
                EmojiSuggestions.Show(possibleEmojis);
            }
        }
        else {
            EmojiSuggestions.Hide();
        }

        LuaOutput.InputChangeCallback(newInput);
    });


Init();