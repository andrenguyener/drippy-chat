import React, { Component } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom'
import SignIn from './SignIn';
import SignUp from './SignUp';
import Messages from './Messages';


class App extends Component {

    render() {
        return (
            <div className="App">
                <Router basename={process.env.PUBLIC_URL}>
                    <div id="router-paths">
                        <Route exact path="/" component={SignIn} />
                        <Route path="/signin" component={SignIn} />
                        <Route path="/signup" component={SignUp} />
                        <Route path="/messages" component={Messages} />
                    </div>
                </Router>
            </div>
        );
    }
}

export default App;
