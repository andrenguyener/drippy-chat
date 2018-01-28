import React, { Component } from 'react';
import { Menu, Icon, List, Sidebar, Segment, Button, Input, Grid, Modal, Header, Form, Responsive, Popup, Comment} from 'semantic-ui-react';
import Container from 'semantic-ui-react/dist/commonjs/elements/Container/Container';
import SidebarPusher from 'semantic-ui-react/dist/commonjs/modules/Sidebar/SidebarPusher'
import "whatwg-fetch";
import Moment from 'react-moment';
import 'moment-timezone';

const host = "api.andren.me"

class Messages extends Component {

    constructor(props) {
        super(props);

        this.state = { 
            visible: false,
            inputChannelName: "",
            inputChannelDescription: "",
            inputMessage: "",
            inputEditName: "",
            inputEditDescription: "",
            submittedMessage: "",
            submittedChannelName: "",
            submittedChannelDescription: "",
            submittedEditDescription: "",
            submittedEditName: "",
            modalOpen: false,
            popupOpen: false,
            buttonColor: "darkblue",
            user: {},
            channels: [],
            currentChannel: {},
            messages: [],
            error: "",
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleNewChannel = this.handleNewChannel.bind(this);
        this.handleNewMessage = this.handleNewMessage.bind(this);
        this.handleEditDescription = this.handleEditDescription.bind(this);
        this.handleEditName = this.handleEditName.bind(this);
        this.handleDeleteChannel = this.handleDeleteChannel.bind(this);
    }

    componentWillMount() {

        if (localStorage.getItem('authorization') === null) {
            this.props.history.push("/");
        }
        this.fetchChannels();
        this.fetchUser();

    }

    componentDidMount() {
        this.websocket = new WebSocket(`wss://${host}/v1/ws?auth=${localStorage.authorization}`);
        this.websocket.addEventListener("error", function(err) {
            console.log(err);
        });
        this.websocket.addEventListener("open", function() {
            console.log("open");
        });
        this.websocket.addEventListener("close", function() {
            console.log("closed")
        });
        this.websocket.addEventListener("message", (event) => {
            console.log(event.data);
            var data = JSON.parse(event.data);
            const messages = this.state.messages;
            const channels = this.state.channels;
            const user = this.state.user;
            var currentChannel = this.state.currentChannel;
            switch (data.type) {
                case "channel-new":
                    channels.push(data.channel);
                    messages[data.channel._id] = [];
                    if (this.state.user.id === data.channel.creator.id) {
                        currentChannel = data.channel;
                    }
                    break;
                
                case "channel-delete":
                    const deletedChannelID = data.channelID;
                    channels.forEach((channel, i) => {
                        if (channel._id === deletedChannelID) {
                            const creatorID = channel.creator.id;

                            if (deletedChannelID === currentChannel._id) {
                                currentChannel = this.state.channels[0];
                                if (creatorID !== user.id) {
                                    window.alert(
                                        'This channel was just deleted by the channel creator.'
                                    );
                                }
                            }

                            channels.splice(i, 1);
                            delete messages[deletedChannelID];
                        }
                    });
                    break;
                case "channel-update":
                    channels.forEach((channel, i) => {
                        if (channel._id === data.channel._id) {
                            channels[i] = data.channel;
                        }
                        if (currentChannel._id === data.channel._id) {
                            currentChannel.name = data.channel.name;
                            currentChannel.description = data.channel.description;
                        }
                    });
                    break;
                  
                case "message-new":
                    if (messages[data.message.channelID]) {
                        messages[data.message.channelID].push(data.message);
                    }
                    break;
                
                case "message-update":
                    if (messages[data.message.channelID]) {
                        messages[data.message.channelID].forEach((message, i) => {
                            if (message._id === data.message._id) {
                                messages[data.message.channelID][i] = data.message;
                            }
                        });
                    }
                    break;
                
                case "message-delete":
                    messages[currentChannel._id].forEach((message, i) => {
                        if (message._id === data.messageID) {
                            messages[currentChannel._id].splice(i, 1);
                        }
                    });
                    break;
                default:
                    break;
            }
            this.setState({channels: channels, messages: messages, currentChannel: currentChannel});
        });
    }

    fetchUser() {
        var request = new Request(`https://${host}/v1/users/me`, {
            method: 'GET',
            headers: this.handleHeaders(),
            mode: 'cors',
            cache: 'default'
        });
        fetch(request)
        .then((response) => {
            response.json().then((data)=> {
                this.setState({user: data});
            })
        })
        .catch(function (err) {
            this.setState({error: err});
            console.log(err);
        });
    }

    fetchChannels() {
        var request = new Request(`https://${host}/v1/channels`, {
            method: 'GET',
            headers: this.handleHeaders(),
            mode: 'cors',
            cache: 'default'
        });
        fetch(request)
        .then((response) => {
            response.json().then((data)=> {
                this.fetchMessages(data[0]._id);
                this.setState({channels: data, currentChannel: data[0]});
            })
        })
        .catch(function (err) {
            this.setState({error: err});
            console.log(err);
        });
    }

    fetchMessages(channelID) {
        var request = new Request(`https://${host}/v1/channels/${channelID}`, {
            method: 'GET',
            headers: this.handleHeaders(),
            mode: 'cors',
            cache: 'default'
        });
        fetch(request)
        .then((response) => {
            response.json().then((data)=> {
                const messages = this.state.messages;
                messages[channelID] = data;
                this.setState({
                    messages: messages
                });
            })
        })
        .catch(function (err) {
            this.setState({error: err});
            console.log(err);
        });
    }

    signOut(event) {
        event.preventDefault();
        var request = new Request(`https://${host}/v1/sessions/mine`, {
            method: 'DELETE',
            headers: this.handleHeaders(),
            mode: 'cors',
            cache: 'default'
        });
        
        fetch(request)
        .then((response) => {
            if (response.status >= 300) {
                return response.text().then((err) => {
                    console.log("Response Error: " + err);
                    this.setState({ resErr: "Response Error: " + err });
                    Promise.reject(err)
                });
            } else {
                localStorage.removeItem('authorization');
                this.props.history.push('/');
            }
        })
        .catch(function (err) {
            this.setState({ fetchErr: "Fetch Error: " + err });
            console.log(err);
        });
    }

    open = () => this.setState({ modalOpen: true })
    close = () => this.setState({ modalOpen: false })

    toggleVisibility = () => this.setState({ visible: !this.state.visible })

    handleNewChannel(event) {
        const promise = new Promise((resolve) => {
            this.setState({buttonColor: "#242A32", submittedChannelName: this.state.inputChannelName, submittedChannelDescription: this.state.inputChannelDescription});
            setTimeout(() => { resolve() }, 1000)
        })
        promise.then(()=> {
            this.setState({
                inputChannelName: "",
                inputChannelDescription: "",
                modalOpen: false,
                buttonColor: "darkblue"
            })
            var newChannel = {
                name: this.state.submittedChannelName,
                description: this.state.submittedChannelDescription
            };
            var request = new Request(`https://${host}/v1/channels`, {
                method: 'POST',
                headers: this.handleHeaders(),
                mode: 'cors',
                body: JSON.stringify(newChannel),
                cache: 'default'
            });
            fetch(request)
            .catch(function (err) {
                this.setState({error: err});
                console.log(err);
            });
         })
    }

    handleNewMessage(event) {
        this.setState({ submittedMessage: this.state.inputMessage }, () => {
            this.setState({ inputMessage: ""});
            var newMessage = {
                body: this.state.submittedMessage
            };
            var request = new Request(`https://${host}/v1/channels/${this.state.currentChannel._id}`, {
                method: 'POST',
                headers: this.handleHeaders(),
                mode: 'cors',
                body: JSON.stringify(newMessage),
                cache: 'default'
            });
            fetch(request)
            .catch((err) => {
                this.setState({error: err});
                console.log(err);
            });
       })       
    }

    handleEditName(event) {
        this.setState({ submittedEditName: this.state.inputEditName }, () => {
            this.setState({ inputEditName: ""});
            var editName = {
                firstname: this.state.submittedEditName,
                lastname: this.state.user.lastName
            };
            var request = new Request(`https://${host}/v1/users/me`, {
                method: 'PATCH',
                headers: this.handleHeaders(),
                mode: 'cors',
                body: JSON.stringify(editName),
                cache: 'default'
            });
            fetch(request)
            .then((response) => {
                response.json().then((data) => {
                    var updateUser = this.state.user;
                    updateUser.firstName = data.firstName;
                    this.setState({ user: updateUser  });
                });

            })
            .catch((err) => {
                this.setState({error: err});
                console.log(err);
            });
       })      
    }

    handleEditDescription(event) {
        this.setState({ submittedEditDescription: this.state.inputEditDescription }, () => {
            this.setState({ inputEditDescription: ""});
            var editDescription = {
                name: this.state.currentChannel.name,
                description: this.state.submittedEditDescription
            };
            var request = new Request(`https://${host}/v1/channels/${this.state.currentChannel._id}`, {
                method: 'PATCH',
                headers: this.handleHeaders(),
                mode: 'cors',
                body: JSON.stringify(editDescription),
                cache: 'default'
            });
            fetch(request)
            .catch((err) => {
                this.setState({error: err});
                console.log(err);
            });
            this.handleClose();
       })       
    }

    handleDeleteChannel(event) {
        var request = new Request(`https://${host}/v1/channels/${this.state.currentChannel._id}`, {
            method: 'DELETE',
            headers: this.handleHeaders(),
            mode: 'cors',
            cache: 'default'
        });
        fetch(request)
        .catch((err) => {
            this.setState({error: err});
            console.log(err);
        });
        this.handleClose();
    }

    handleChange(event) {
        var field = event.target.name;
        var value = event.target.value;
        var changes = {};
        changes[field] = value;
        this.setState(changes);
    }

    handleOpen = () => {
        this.setState({ popupOpen: true })
      }
    
    handleClose = () => {
        this.setState({ popupOpen: false })
    }

    handleHeaders() {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", localStorage.getItem('authorization'));
        return myHeaders;
    }

    pressKeyDown(event) {
        var keypressed = event.keyCode || event.which;
        if (keypressed === 13) {
            this.handleNewMessage(event);
        }
    }

    render() {

        var channelList;
        var messageList;
        if(this.state.channels) {
            channelList = this.state.channels.map(channel => 
                <List.Item as='a' key={channel._id} id={channel._id} className={this.state.currentChannel._id === channel._id ? 'active-channel' : ''} onClick={(e) => {this.setState({currentChannel: channel}); this.fetchMessages(channel._id);}}>#{channel.name}</List.Item>
            );
        }
        
        if(this.state.messages[this.state.currentChannel._id]) {
            messageList = this.state.messages[this.state.currentChannel._id].map(message =>
              
                <Comment key={message._id}>
                    <Comment.Avatar src={message.creator.photoURL + "?d=monsterid"}  />
                    <Comment.Content>
                      <Comment.Author as='a'>{message.creator.firstName}</Comment.Author>
                      <Comment.Metadata>
                        <div><Moment fromNow unix >{message.createdAt/1000}</Moment></div>
                      </Comment.Metadata>
                      <Comment.Text>{message.body}</Comment.Text>
                    </Comment.Content>
                  </Comment>
            );
        }


        let nav =  <Menu vertical icon='labeled' id='main-sidebar-container'>

                        <Menu.Item className='main-logo'>
                            <div className="sidebar-title"><Icon name="tint" size="big"/><h2>Drippy</h2></div>
                            <div className="sidebar-name">
                                <h4>{this.state.user.firstName}</h4>
                                <Popup
                                    trigger={<Icon className="edit-pencil" size="medium" name='pencil'/>}
                                    content={<Input action={{content: "Edit", onClick: this.handleEditName}} placeholder={this.state.user.firstName} name="inputEditName" value={this.state.inputEditName} onChange={this.handleChange}/>}
                                    on='click'
                                />
                            </div>
                        </Menu.Item>

                        <Menu.Item name='channels'>
                            <div className="sidebar-channel">
                                <h4>Channels</h4>
                                <Modal trigger={<Icon className="channel-plus" size="medium" name='plus circle'/>} 
                                    closeIcon
                                    open={this.state.modalOpen}
                                    onOpen={this.open}
                                    onClose={this.close}
                                >
                    
                                    <Modal.Content className="modal-channel">
                                        <Modal.Description>
                                            <Header>Create a new channel</Header>
                                            <p> Chat with new people! </p>
                                        <Form>
                                            <Form.Group className="modal-form" >
                                                <Form.Field className="modal-form-field" >
                                                    <label>Name</label>
                                                    <input placeholder='Channel Name' name="inputChannelName" value={this.state.inputChannelName} onChange={this.handleChange}/>
                                                </Form.Field>
                                                <Form.Field className="modal-form-field" >
                                                    <label>Description</label>
                                                    <input placeholder='Channel Description' name="inputChannelDescription" value={this.state.inputChannelDescription} onChange={this.handleChange}/>
                                                </Form.Field>
                                            </Form.Group>
                                        </Form>
                                        </Modal.Description>
                                    </Modal.Content>

                                    <Modal.Actions>
                                        <Button color='grey' onClick={this.close}>
                                            <Icon name='remove' /> Cancel
                                        </Button>
                                        <Button color={this.state.buttonColor} onClick={this.handleNewChannel}>
                                            <Icon name='checkmark'/> Create
                                        </Button>
                                    </Modal.Actions>
                                </Modal>
                            </div>
                            <List>
                                {channelList}
                            </List>
                        </Menu.Item>
                            <h4 className="button-signout" onClick={(e) => this.signOut(e)}>Sign Out</h4>
                    </Menu> ;
        
        return (
        <Sidebar.Pushable as={Segment} style={{overflow: "hidden", borderRadius: "0", border: "0"}}>
            <Sidebar as={Menu} vertical animation='push' width='thin' icon='labeled' id='main-sidebar-container-mobile' visible={this.state.visible}>
                <Menu.Item className='main-logo'>
                    
                    <div className="sidebar-title"><Icon name="tint" size="big"/><h2>Drippy</h2></div>
                    <div className="sidebar-name">
                        <h4>{this.state.user.firstName}</h4>
                        <Popup
                            trigger={<Icon className="edit-pencil" size="medium" name='pencil'/>}
                            content={<Input action={{content: "Edit", onClick: this.handleEditName}} placeholder={this.state.user.firstName} name="inputEditName" value={this.state.inputEditName} onChange={this.handleChange}/>}
                            on='click'
                        />
                    </div>
                </Menu.Item>
                <Menu.Item name='channels'>
                
                            <div className="sidebar-channel">
                                <h4>Channels</h4>
                                <Modal trigger={<Icon className="channel-plus" size="medium" name='plus circle'/>} 
                                    closeIcon
                                    open={this.state.modalOpen}
                                    onOpen={this.open}
                                    onClose={this.close}
                                >
                                
                                    <Modal.Content className="modal-channel">
                                        <Modal.Description>
                                            <Header>Create a new channel</Header>
                                            <p> Chat with new people! </p>
                                        <Form>
                                            <Form.Group className="modal-form" >
                                                <Form.Field className="modal-form-field" >
                                                    <label>Name</label>
                                                    <input placeholder='Channel Name' name="inputChannelName" value={this.state.inputChannelName} onChange={this.handleChange}/>
                                                </Form.Field>
                                                <Form.Field className="modal-form-field" >
                                                    <label>Description</label>
                                                    <input placeholder='Channel Description' name="inputChannelDescription" value={this.state.inputChannelDescription} onChange={this.handleChange}/>
                                                </Form.Field>
                                            </Form.Group>
                                        </Form>
                                        </Modal.Description>
                                    </Modal.Content>
                                    <Modal.Actions>
                                        <Button color='grey' onClick={this.close}>
                                            <Icon name='remove' /> Cancel
                                        </Button>
                                        <Button color={this.state.buttonColor} onClick={this.handleNewChannel}>
                                            <Icon name='checkmark'/> Create
                                        </Button>
                                    </Modal.Actions>
                                </Modal>
                            </div>
                    <List>
                        {channelList}
                    </List>
                </Menu.Item>
                <h4 className="button-signout" onClick={(e) => this.signOut(e)}>Sign Out</h4>
            </Sidebar>
    
            <SidebarPusher>
                <Grid id="grid">
                    <Grid.Row fluid="true" id="screen-view" stretched>
                        <Responsive minWidth={768} style={{width: "210px"}}>
                            <Grid.Column id="nav-section" stretched>
                                {nav}
                            </Grid.Column>
                        </Responsive>
                        
                        <Grid.Column id="message-section">
                            <Container id="message-header">
                                <div style={{display: "flex"}}>
                                <Responsive maxWidth={767}><Icon name="bars" className="hamburger-bar" onClick={this.toggleVisibility}/></Responsive>
                                    <h3>#{this.state.currentChannel.name} </h3>
                                </div>

                            
                                <Responsive minWidth={768}>
                                    <div id="channel-header">      
                                        {/* <Icon name='users' />   */}
                                        <Popup
                                            trigger={<p> {this.state.currentChannel.description === '' ? "Add a topic" : this.state.currentChannel.description}<Icon id="description-edit-icon" size="small" name='pencil' /></p>}
                                            content={<Input action={{content: "Edit", onClick: this.handleEditDescription}} placeholder={this.state.currentChannel.description === '' ? "Add a topic" : this.state.currentChannel.description} name="inputEditDescription" value={this.state.inputEditDescription} onChange={this.handleChange}/>}

                                            on='click'
                                        />
                                    </div>
                                </Responsive>
                                <Popup
                                    trigger={<Icon name='ellipsis vertical' id="ellipsis-vertical" size="big"/>}
                                    content={<Button content='Delete Channel' onClick={this.handleDeleteChannel}/>}
                                    open={this.state.popupOpen}
                                    onOpen={this.handleOpen}
                                    onClose={this.handleClose}
                                    on='click'
                                />
                                
                            </Container>
                            <Container id="message-main">
                                <Comment.Group>
                                {/* <List className="message-list" relaxed='very'> */}
                                    {messageList}
                                {/* </List> */}
                                </Comment.Group>
                            </Container>
                            <Input id="message-input" fluid type='text' placeholder='Message' action>
                                <input name="inputMessage" value={this.state.inputMessage} onChange={this.handleChange} onKeyDown={e => this.pressKeyDown(e)}/>
                                <Button type='submit' onClick={this.handleNewMessage}>+</Button>
                            </Input>
                        </Grid.Column>
                    </Grid.Row>
                </Grid>
            </SidebarPusher>
        </Sidebar.Pushable>
        );
    }
}


export default Messages;
