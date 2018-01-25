package handlers

import (
	"github.com/info344-a17/challenges-andrenguyener/servers/gateway/indexes"
	"github.com/info344-a17/challenges-andrenguyener/servers/gateway/models/users"
	"github.com/info344-a17/challenges-andrenguyener/servers/gateway/sessions"
)

//TODO: define a handler context struct that
//will be a receiver on any of your HTTP
//handler functions that need access to
//globals, such as the key used for signing
//and verifying SessionIDs, the session store
//and the user store

type Context struct {
	SessionKey   string
	SessionStore sessions.Store
	UserStore    users.Store
	TrieStore    indexes.Store
	Notifier     *Notifier
}
