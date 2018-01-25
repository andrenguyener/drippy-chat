package users

import (
	"fmt"
	"strings"

	"github.com/info344-a17/challenges-andrenguyener/servers/gateway/indexes"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

type updateDoc struct {
	FirstName string
	LastName  string
}

//MongoStore implements Store for MongoDB
type MongoStore struct {
	session    *mgo.Session
	collection *mgo.Collection
}

//NewMongoStore constructs a new MongoStore, given a live mgo.Session, a database name, and a collection name
func NewMongoStore(sess *mgo.Session, dbname string, collname string) *MongoStore {
	if sess == nil {
		panic("nil pointer passed for session")
	}
	return &MongoStore{
		session:    sess,
		collection: sess.DB(dbname).C(collname),
	}
}

//GetByID returns the User with the given ID
func (ms *MongoStore) GetByID(id bson.ObjectId) (*User, error) {
	user := &User{}
	err := ms.collection.FindId(id).One(user)
	if err != nil {
		return nil, fmt.Errorf("Error could not find user by ID %s", err)
	}
	return user, nil
}

//GetByEmail returns the User with the given email
func (ms *MongoStore) GetByEmail(email string) (*User, error) {
	user := &User{}
	err := ms.collection.Find(bson.M{"email": email}).One(user)
	if err == mgo.ErrNotFound {
		return nil, ErrUserNotFound
	}
	return user, nil
}

//GetByUserName returns the User with the given Username
func (ms *MongoStore) GetByUserName(username string) (*User, error) {
	user := &User{}
	err := ms.collection.Find(bson.M{"username": username}).One(user)
	if err == mgo.ErrNotFound {
		return nil, ErrUserNotFound
	}
	return user, nil
}

//Insert converts the NewUser to a User, inserts
//it into the database, and returns it
func (ms *MongoStore) Insert(newUser *NewUser) (*User, error) {

	user, err := newUser.ToUser()
	if err != nil {
		return nil, fmt.Errorf("Error converting new user to user %s", err)
	}
	if err := ms.collection.Insert(user); err != nil {
		return nil, fmt.Errorf("Error inserting user %s", err)
	}
	return user, nil
}

//Update applies UserUpdates to the given user ID
func (ms *MongoStore) Update(userID bson.ObjectId, updates *Updates) error {

	col := ms.collection
	userupdates := bson.M{"$set": updates}
	err := col.UpdateId(userID, userupdates)
	return err

}

//Delete deletes the user with the given ID
func (ms *MongoStore) Delete(userID bson.ObjectId) error {
	if err := ms.collection.RemoveId(userID); err != nil {
		return fmt.Errorf("Error deleting user ID %s", err)
	}
	return nil
}

func (ms *MongoStore) AddTrie() (*indexes.Trie, error) {
	var results []User
	trie := indexes.NewTrie()
	err := ms.collection.Find(nil).All(&results)

	if err != nil {
		return nil, err
	}

	for _, user := range results {
		trie.Add(strings.ToLower(user.Email), user.ID)
		trie.Add(strings.ToLower(user.UserName), user.ID)
		trie.Add(strings.ToLower(user.FirstName), user.ID)
		trie.Add(strings.ToLower(user.LastName), user.ID)
	}

	return trie, nil

}

func (ms *MongoStore) ReturnUsers(ids []bson.ObjectId) []*User {
	var userSlice []*User
	for _, user := range ids {
		singleUser, _ := ms.GetByID(user)
		userSlice = append(userSlice, singleUser)
	}
	return userSlice
}
