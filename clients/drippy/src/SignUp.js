import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, Grid, Header, Message, Segment, Icon } from "semantic-ui-react"
const host = "api.andren.me";

class SignUp extends React.Component {
    constructor(props) {
        super(props);
    
        this.state = {
            'email': undefined,
            'password': undefined,
            'username': undefined,
            'firstname': undefined,
            'lastname': undefined,
            'passwordconf': undefined,
            'error': ""
        };
    
        this.handleChange = this.handleChange.bind(this);
      }

    handleChange(event) {
        var field = event.target.id;
        var value = event.target.value;
        var changes = {};
        changes[field] = value;
        this.setState(changes);
    }
    
    signUp(event) {
        event.preventDefault();
        var thisComponent = this;
        delete this.state['error'];

        var apiURL = `https://${host}/v1/users`;
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        var request = new Request(apiURL, {
            method: 'POST',
            headers: myHeaders,
            mode: 'cors',
            body: JSON.stringify(this.state),
            cache: 'default'
        });
        
        fetch(request)
        .then(function(response) {
            if (response.status >= 300) {
                return response.text().then((err) => {
                    thisComponent.setState({error: "Response Error: " + err });
                    Promise.reject(err)
                });
            } else {
                localStorage.setItem('authorization', response.headers.get('Authorization'));
                thisComponent.props.history.push('/messages');
            }
        })
        .catch(function (err) {
            thisComponent.setState({error : "Fetch Error: " + err});
        });
    }  


    render() {
        return (
            <div className="login-form">
                <Grid
                    textAlign="center"
                    style={{ height: "100%" }}
                    verticalAlign="middle"
                >
                    <Grid.Column style={{ maxWidth: 450 }}>
                        <Header as="h2" textAlign="center">
                            <span className="icon-logo"><Icon name="tint"/></span>
                            <span >Drippy</span>
                        </Header>
                        <Form size="large" className="brown-form">
                            <Segment stacked>
                                <Form.Input
                                    fluid
                                    icon="user"
                                    iconPosition="left"
                                    placeholder="First name"
                                    id="firstname"
                                    onChange={this.handleChange} required 
                                />
                                <Form.Input
                                    fluid
                                    icon="user"
                                    iconPosition="left"
                                    placeholder="Last name"
                                    id="lastname"
                                    onChange={this.handleChange} required
                                />
                                <Form.Input
                                    fluid
                                    icon="user"
                                    iconPosition="left"
                                    placeholder="User name"
                                    id="username"
                                    onChange={this.handleChange} required 
                                />
                                <Form.Input
                                    fluid
                                    icon="mail"
                                    iconPosition="left"
                                    placeholder="E-mail address"
                                    id="email"
                                    onChange={this.handleChange} required 
                                />
                                <Form.Input
                                    fluid
                                    icon="lock"
                                    iconPosition="left"
                                    placeholder="Password"
                                    id="password"
                                    type="password"
                                    onChange={this.handleChange} required
                                />
                                <Form.Input
                                    fluid
                                    icon="lock"
                                    iconPosition="left"
                                    placeholder="Confirm Password"
                                    id="passwordconf"
                                    type="password"
                                    onChange={this.handleChange} required
                                />
                    
                                <Button className="green-button" fluid size="large" onClick={(e) => this.signUp(e)}>Signup</Button>
                            </Segment>
                        </Form>
                        <Message className="lightbrown-message">
                        Already have an account? <Link to="/signin"> Sign In </Link>
                        </Message>
                            <h5 className="error-message">{this.state.error}</h5>
                    </Grid.Column>
                </Grid>

            </div>
        );

    }
}

    
    
export default SignUp;
    