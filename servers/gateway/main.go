package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/info344-a17/challenges-andrenguyener/servers/gateway/models/users"
	"github.com/info344-a17/challenges-andrenguyener/servers/gateway/sessions"
	"github.com/streadway/amqp"
	mgo "gopkg.in/mgo.v2"

	"github.com/go-redis/redis"
	"github.com/info344-a17/challenges-andrenguyener/servers/gateway/handlers"
)

func GetCurrentUser(r *http.Request, ctx *handlers.Context) *users.User {
	sessionState := &handlers.SessionState{}
	_, err := sessions.GetState(r, ctx.SessionKey, ctx.SessionStore, sessionState)
	if err != nil {
		fmt.Printf("Error cannot get session state: "+err.Error(), http.StatusUnauthorized)
	}
	sessionUser := sessionState.User
	return sessionUser
}

func NewServiceProxy(addrs []string, ctx *handlers.Context) *httputil.ReverseProxy {
	nextIndex := 0
	mx := sync.Mutex{}
	return &httputil.ReverseProxy{
		Director: func(r *http.Request) {

			user := GetCurrentUser(r, ctx)
			userJSON, err := json.Marshal(user)
			if err != nil {
				log.Printf("error marshaling user: %v", err)
			}
			r.Header.Set("X-User", string(userJSON))
			r.Header.Set("Content-Type", "application/json")
			mx.Lock()
			r.URL.Host = addrs[nextIndex%len(addrs)]
			nextIndex++
			mx.Unlock()
			r.URL.Scheme = "http"
		},
	}
}

func listen(msgs <-chan amqp.Delivery) {
	log.Println("listening for new messages...")
	for msg := range msgs {
		log.Println(string(msg.Body))
	}
}

const summaryPath = "/v1/summary"

//main is the main entry point for the server
func main() {
	/* TODO: add code to do the following
	- Read the ADDR environment variable to get the address
	  the server should listen on. If empty, default to ":80"
	- Create a new mux for the web server.
	- Tell the mux to call your handlers.SummaryHandler function
	  when the "/v1/summary" URL path is requested.
	- Start a web server listening on the address you read from
	  the environment variable, using the mux you created as
	  the root handler. Use log.Fatal() to report any errors
	  that occur when trying to start the web server.
	*/
	// addr := os.Getenv("ADDR")
	addr := "localhost:4000"
	// sessionKey := os.Getenv("SESSIONKEY")
	sessionKey := "password"
	// redisAddr := os.Getenv("REDISADDR")
	redisAddr := "localhost:6379"
	// dbAddr := os.Getenv("DBADDR")
	dbAddr := "localhost:27017"
	// messagesaddr := os.Getenv("MESSAGESSVCADDR")
	messagesaddr := "localhost:4004"
	// summaryaddr := os.Getenv("SUMMARYSVCADDR")
	summaryaddr := "localhost:80"
	if len(addr) == 0 {
		addr = ":443"
	}

	if len(redisAddr) == 0 {
		redisAddr = "redissvr:6379"
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: redisAddr,
	})

	redisStore := sessions.NewRedisStore(redisClient, time.Hour)

	if len(dbAddr) == 0 {
		dbAddr = "mongos:27017"
	}

	sess, err := mgo.Dial(dbAddr)
	if err != nil {
		log.Fatalf("error dialing mongosss: %v\n", err)
	}
	mongoStore := users.NewMongoStore(sess, "mongo", "users")
	trieStore, err := mongoStore.AddTrie()
	if err != nil {
		fmt.Printf("trie could not be loaded: %s", err)
	}

	mqAddr := os.Getenv("MQADDR")
	if len(mqAddr) == 0 {
		// mqAddr = "rabbit:5672"
		mqAddr = "localhost:5672"
	}

	mqURL := fmt.Sprintf("amqp://%s", mqAddr)
	conn, err := amqp.Dial(mqURL)
	if err != nil {
		log.Fatalf("error connecting to RabbitMQ: %v", err)
	}
	channel, err := conn.Channel()
	if err != nil {
		log.Fatalf("error creating channel: %v", err)
	}
	q, err := channel.QueueDeclare("testQ", false, false, false, false, nil)

	msgs, err := channel.Consume(q.Name, "", true, false, false, false, nil)
	//go listen(msgs)

	notifier := handlers.NewNotifier(msgs)

	ctx := &handlers.Context{
		SessionKey:   sessionKey,
		SessionStore: redisStore,
		UserStore:    mongoStore,
		TrieStore:    trieStore,
		Notifier:     notifier,
	}

	// tlskey := os.Getenv("TLSKEY")
	tlskey := "./../tls/privkey.pem"
	// tlscert := os.Getenv("TLSCERT")
	tlscert := "./../tls/fullchain.pem"
	if len(tlskey) == 0 || len(tlscert) == 0 {
		log.Fatal("please set TLSKEY and TLSCERT")
	}

	splitMessagesAddrs := strings.Split(messagesaddr, ",")
	splitSummaryAddrs := strings.Split(summaryaddr, ",")

	mux := http.NewServeMux()
	mux.HandleFunc("/v1/users", ctx.UsersHandler)
	mux.HandleFunc("/v1/users/me", ctx.UsersMeHandler)
	mux.HandleFunc("/v1/sessions", ctx.SessionsHandler)
	mux.HandleFunc("/v1/sessions/mine", ctx.SessionsMineHandler)
	corsHandler := handlers.NewCORSHandler(mux)
	mux.Handle("/v1/ws", ctx.NewWebSocketsHandler(notifier))
	fmt.Printf("server is listening at https://%s\n", addr)

	mux.Handle("/v1/channels", NewServiceProxy(splitMessagesAddrs, ctx))
	mux.Handle("/v1/channels/", NewServiceProxy(splitMessagesAddrs, ctx))
	mux.Handle("/v1/messages/", NewServiceProxy(splitMessagesAddrs, ctx))
	mux.Handle("/v1/summary", NewServiceProxy(splitSummaryAddrs, ctx))
	mux.Handle("/v1/payments", NewServiceProxy(splitMessagesAddrs, ctx))
	mux.Handle("/v1/payments/", NewServiceProxy(splitMessagesAddrs, ctx))
	log.Fatal(http.ListenAndServeTLS(addr, tlscert, tlskey, corsHandler))

}
