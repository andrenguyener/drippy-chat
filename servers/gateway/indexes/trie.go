package indexes

import (
	"sort"
	"sync"

	"gopkg.in/mgo.v2/bson"
)

//TODO: implement a trie data structure that stores
//keys of type string and values of type bson.ObjectId

type Trie struct {
	root   *Node
	rwm    sync.RWMutex
	height int
}

func NewTrie() *Trie {
	return &Trie{
		root: &Node{
			children: make(map[string]*Node),
		},
		height: 1,
		rwm:    sync.RWMutex{},
	}
}

type Node struct {
	key      string
	value    []bson.ObjectId
	children map[string]*Node
	height   int
}

func NewNode(key string) *Node {
	return &Node{
		children: make(map[string]*Node),
		key:      key,
	}
}

func (t *Trie) Size() int {
	return t.height
}

func (t *Trie) Add(key string, value bson.ObjectId) {
	t.rwm.Lock()

	currentNode := t.root
	runeKey := []rune(key)
	for _, letter := range runeKey {
		if currentNode.children[string(letter)] == nil {
			currentNode.children[string(letter)] = NewNode(string(letter))
		}
		currentNode = currentNode.children[string(letter)]
	}

	if len(currentNode.value) == 0 {
		t.height++
	}
	flag := false
	for _, v := range currentNode.value {
		if v == value {
			flag = true
		}
	}
	if flag == false {
		currentNode.value = append(currentNode.value, value)
	}

	defer t.rwm.Unlock()
}

func (t *Trie) Delete(key string, value bson.ObjectId) bool {
	t.rwm.Lock()
	defer t.rwm.Unlock()
	currentNode := t.root
	runeKey := []rune(key)
	keyLength := len(runeKey)

	path := make([]nodeLetter, keyLength)
	for index, letter := range runeKey {

		if currentNode.children[string(letter)] == nil {

			return false
		}

		path[index] = nodeLetter{node: currentNode.children[string(letter)], letter: string(letter)}
		currentNode = currentNode.children[string(letter)]

		if index == keyLength-1 {
			flag := false
			for i, v := range currentNode.value {
				if v == value {
					flag = true
					currentNode.value = append(currentNode.value[:i], currentNode.value[i+1:]...)
				}
			}
			if flag == false {
				return false
			}

			if len(currentNode.children) == 0 {

				for i := keyLength - 1; i >= 0; i-- {
					parentNode := path[i].node
					l := path[i].letter
					delete(parentNode.children, l)

					if len(parentNode.value) > 1 || !(len(parentNode.children) == 0) {
						break
					}
				}
			}
		}
	}

	return true
}

type nodeLetter struct {
	node   *Node
	letter string
}

func (t *Trie) DFSChildren(prefix string, n int) []bson.ObjectId {
	currentNode := t.root
	runeKey := []rune(prefix)
	for _, letter := range runeKey {
		if currentNode.children[string(letter)] == nil {

			return nil
		}

		currentNode = currentNode.children[string(letter)]
	}
	if len(currentNode.children) == 0 {
		return currentNode.value
	}
	culminatedValues := currentNode.DFS(prefix)
	lengthValues := len(culminatedValues)
	sort.Sort(sort.StringSlice(culminatedValues))
	nValues := []string{}
	if lengthValues < n {
		nValues = culminatedValues[0:lengthValues]
	} else {
		nValues = culminatedValues[0:n]
	}
	userIDslice := []bson.ObjectId{}
	currentNode2 := t.root
	for _, key := range nValues {
		currentNode2 = t.root
		runeKey2 := []rune(key)
		for _, letter := range runeKey2 {

			currentNode2 = currentNode2.children[string(letter)]
		}
		for i := range currentNode2.value {
			userIDslice = append(userIDslice, currentNode2.value[i])
		}

	}

	return userIDslice
}

func (n *Node) DFS(prefix string) []string {
	children := []string{}

	for key, child := range n.children {
		if len(child.children) == 0 || len(child.value) > 0 {
			children = append(children, prefix+key)
		}

		children = append(children, child.DFS(prefix+key)...)
	}

	return children
}
