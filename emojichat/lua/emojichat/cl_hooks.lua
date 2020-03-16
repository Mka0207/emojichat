local disable_chatbox = false

CreateClientConVar("fwkzt_disablechatbox", "0", true, false)
if GetConVar("fwkzt_disablechatbox"):GetInt() == 1 then
	disable_chatbox = true
end

hook.Remove("InitPostEntity", "emojichat_init")
hook.Add("InitPostEntity", "emojichat_init", function()
	if disable_chatbox then return end
	
    eChat.buildBox()
end)

hook.Remove("ChatText", "emojichat_joinleave")
hook.Add("ChatText", "emojichat_joinleave", function( index, name, text, type )
	if disable_chatbox then return end
    if type != "chat" then
        eChat.AddServerMessage(text)
        return true
    end
end)

ECHAT_MODE = CHATMODE_GLOBAL
hook.Remove("PlayerBindPress", "emojichat_hijackbind")
hook.Add("PlayerBindPress", "emojichat_hijackbind", function(ply, bind, pressed)
	if disable_chatbox then return end

    if string.sub( bind, 1, 11 ) == "messagemode" then
        local chatMode = CHATMODE_GLOBAL
        if bind == "messagemode2" then
            chatMode = CHATMODE_TEAM
        end
		ECHAT_MODE = chatMode

        eChat.showBox(chatMode)
        return true
    end
end)

hook.Remove("HUDShouldDraw", "emojichat_hidedefault")
hook.Add("HUDShouldDraw", "emojichat_hidedefault", function( name )
    if name == "CHudChat" then
		if disable_chatbox then return end
        return false
    end
end)

hook.Remove("ChatTextChanged", "emoji_grab_chat")
hook.Add("ChatTextChanged", "emoji_grab_chat", function(text)
	eChat.LastText = text
end )

hook.Remove("Think", "emojichat_fixmacusers")
hook.Add("Think", "emojichat_fixmacusers", function()
	if input.IsKeyDown( KEY_ESCAPE ) then
		if eChat.frame and eChat.frame:IsValid() then
			if eChat.frame:IsVisible() then
				eChat.LastText = ""
				eChat.hideBox()
			end
		end
	elseif input.IsKeyDown( KEY_ENTER ) then
		if eChat.frame and eChat.frame:IsValid() then
			if eChat.frame:IsVisible() then
				if ECHAT_MODE == 1 then
					LocalPlayer():ConCommand("say "..string.Trim(eChat.LastText))
				else
					LocalPlayer():ConCommand("say_team "..string.Trim(eChat.LastText))
				end
				eChat.LastText = ""
				eChat.hideBox()
			end
		end
	end
end)