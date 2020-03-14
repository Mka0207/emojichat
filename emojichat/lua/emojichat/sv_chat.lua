--[[hook.Remove("PlayerConnect", "echat_playerconnect")
hook.Add("PlayerConnect", "echat_playerconnect", function(name, ip)
    PrintMessage(HUD_PRINTTALK, name .. " has joined the server.")
end)

hook.Remove("PlayerInitialSpawn", "echat_playerinitialspawn")
hook.Add("PlayerInitialSpawn", "echat_playerinitialspawn", function(ply)
    ply:ChatPrint(ply:Nick() .. " has joined the server.")
end)

hook.Remove("PlayerDisconnected", "echat_playerdisconnected")
hook.Add("PlayerDisconnected", "echat_playerdisconnected", function(ply)
    PrintMessage(HUD_PRINTTALK, ply:Nick() .. " has left the server.")
end)]]


util.AddNetworkString("SetTypingStatus")
net.Receive("SetTypingStatus", function(len, ply)
    local isTyping = net.ReadBool()
    ply:SetNWBool("IsTyping", isTyping)
end)

hook.Remove("PlayerSay", "emojichat_urlfilter")
hook.Add("PlayerSay", "emojichat_urlfilter", function( ply, text, team )
	local http_start, http_end = string.find( text:lower(), "http" )
	if http_start then
		if not string.find( text:lower(), "fwkzt.com" ) then
			return string.sub( text, 9, #text )
		end
	end
end)
