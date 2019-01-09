DESTINATION_GLOBAL = 1
DESTINATION_TEAM = 2
DESTINATION_CONSOLE = 3


HTMLChatComponent = { }
HTMLChatComponent.__index = HTMLChatComponent

function HTMLChatComponent.New(htmlVGUIElement)
	local self = setmetatable({}, HTMLChatComponent)
	self.htmlElement = htmlVGUIElement
	return self
end

function HTMLChatComponent.RenderTextLine(self, textComponents)
	local json = string.JavascriptSafe(util.TableToJSON(textComponents))
	self.htmlElement:QueueJavascript("emojiChat.addOutput('" .. json  .. "')")
end

function HTMLChatComponent.SetActive(self, chatMode)
	local desination = DESTINATION_GLOBAL
	if(chatMode == CHATMODE_TEAM) then
		desination = DESTINATION_TEAM
	end

	self.htmlElement:QueueJavascript("emojiChat.setActive(" .. desination .. ")")
end

function HTMLChatComponent.SetInactive(self)
	self.htmlElement:QueueJavascript("emojiChat.setInactive()")
end

function HTMLChatComponent.UpdateFadeTime(self, durationInSeconds)
	self.htmlElement:QueueJavascript("emojiChat.setFadeTime(" .. durationInSeconds .. ")")
end

function HTMLChatComponent.SetPlayerList(self, playerList)
	local json = string.JavascriptSafe(util.TableToJson(playerList))
	self.htmlElement:QueueJavascript("emojiChat.setPlayerList('" .. json  .. "')")
end
