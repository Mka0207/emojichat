TextComponentBuilder.SetDefaultChatColour(eChat.config.defaultChatColour)
TextComponentBuilder.SetTimestampChatColour(eChat.config.timestampColour)
TextComponentBuilder.SetTimestampsEnabled(eChat.config.timestamps)

function eChat.buildBox()
    eChat.frame = vgui.Create("DFrame")
    eChat.frame:MoveToBack()
    eChat.frame:SetSize( ScrW()*0.375, ScrH()*0.25 )
    eChat.frame:SetTitle("")
    eChat.frame:ShowCloseButton( false )
    eChat.frame:SetDraggable( true )
    eChat.frame:SetSizable( false )
    eChat.frame:SetPos( ScrW()*0.0116, (ScrH() - eChat.frame:GetTall()) - ScrH()*0.177)
    eChat.frame:SetMinWidth( 300 )
    eChat.frame:SetMinHeight( 100 )
    eChat.frame.Paint = function( self, w, h )
        if not eChat.Active then return end

        BlurPanel( self, 10, 20, 255 )
        draw.RoundedBox( 0, 0, 0, w, h, Color( 30, 30, 30, 200 ) )

        draw.RoundedBox( 0, 0, 0, w, 25, Color( 80, 80, 80, 100 ) )
    end

   --[[ local serverName = vgui.Create("DLabel", eChat.frame)
    serverName:SetText( GetHostName() )
    serverName:SetFont( "ChatFont")
    serverName:SizeToContents()
    serverName:SetPos( 5, 4 )]]

    eChat.chatLog = vgui.Create( "DHTML" , eChat.frame )
    eChat.chatLog:SetSize( eChat.frame:GetWide() - 10, eChat.frame:GetTall() - 40 )
    eChat.chatLog:SetPos( 5, 35 )
    eChat.chatLog.Paint = function( self, w, h )
        if not eChat.Active then return end
        --draw.RoundedBox( 0, -5, -5, w + 10, h + 10, Color( 30, 30, 30, 100 ) )
    end
    eChat.chatLog:SetVisible( true )
    eChat.chatLog:SetHTML(eChat.config.html)
    eChat.chatLog:SetAllowLua( true )

    eChat.HTMLOutput = HTMLChatComponent.New(eChat.chatLog)

    eChat.UpdateFadeTime()

    eChat.Ready = true
    eChat.RenderExistingMessages()

    if (eChat.Active) then
        eChat.showBox(eChat.ChatMode)
    else
        eChat.hideBox()
    end
end

function eChat.RenderExistingMessages()
    for _, message in pairs( eChat.ExistingMessages ) do
        eChat.AddLine(message)
    end
end

function eChat.hideBox()
    if not eChat.Ready then
        eChat.Active = false
        return
    end

    eChat.HTMLOutput:SetInactive()
    eChat.StopTyping()

    local children = eChat.frame:GetChildren()
    for _, pnl in pairs( children ) do
        if pnl == eChat.frame.btnMaxim or pnl == eChat.frame.btnClose or pnl == eChat.frame.btnMinim then continue end

        if pnl != eChat.chatLog then
            pnl:SetVisible( false )
        end
    end

    eChat.frame:SetMouseInputEnabled( false )
    eChat.frame:SetKeyboardInputEnabled( false )
    eChat.frame:MoveToBack()
    gui.EnableScreenClicker( false )

    eChat.Active = false
    hook.Run("FinishChat")
end


function eChat.showBox(mode)
    if not eChat.Ready then
        eChat.Active = true
        eChat.ChatMode = mode
        return
    end

    eChat.HTMLOutput:SetActive(mode)
    eChat.StartTyping()

    local children = eChat.frame:GetChildren()
    for _, pnl in pairs( children ) do
        if pnl == eChat.frame.btnMaxim or pnl == eChat.frame.btnClose or pnl == eChat.frame.btnMinim then continue end

        pnl:SetVisible( true )
    end

    eChat.frame:MakePopup()
    eChat.chatLog:RequestFocus()

    eChat.Active = true
    hook.Run("StartChat", eChat.ChatMode == CHATMODE_TEAM)
end

function eChat.AddLine(textComponents)
    if not eChat.Ready then
        table.insert(eChat.ExistingMessages, textComponents)
    else
        eChat.HTMLOutput:RenderTextLine(textComponents)
    end
end

function eChat.AddServerMessage(message)
    eChat.AddLine(TextComponentBuilder.Build(eChat.config.serverMessageColour, message))
end

function eChat.UpdateFadeTime(durationInSeconds)
    if (durationInSeconds != nil) then
        eChat.config.fadeTime = durationInSeconds;
    end

    eChat.HTMLOutput:UpdateFadeTime(eChat.config.fadeTime)
end

function eChat.StartTyping()
    net.Start("SetTypingStatus")
    net.WriteBool(true)
    net.SendToServer()
end

function eChat.StopTyping()
    net.Start("SetTypingStatus")
    net.WriteBool(false)
    net.SendToServer()
end
