/**
 * This file provided by Facebook is for non-commercial testing and evaluation purposes only.
 * Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var Event = React.createClass({
  render: function() {
    var rawMarkup = marked(this.props.children.toString(), {sanitize: true});
    return (
      <div className="Event">
        <h2 className="EventType">
          Event: {this.props.eventType}
        </h2>
        <span dangerouslySetInnerHTML={{__html: rawMarkup}} />
      </div>
    );
  }
});

var EventBox = React.createClass({
  loadEventsFromServer: function() {
    $.ajax({
      url: this.props.eventsUrl,
      dataType: 'json',
      data: {apikey: this.state.apiKey},
      cache: false,
      success: function(data) {
        this.setState({data: data});
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.eventsUrl, status, err.toString());
      }.bind(this)
    });
  },
  componentDidMount: function () {
    $.ajax({
        url: this.props.configUrl,
        dataType: 'json',
        type: 'GET',
        success: function(config) { // callback method for further manipulations             
          console.log("Config loaded", config);

          this.setState({config: config, configError: null});
        }.bind(this),
        error: function(xhr, status, err) {
          this.setState({
            configError: xhr.responseText
          })
        }.bind(this)
      });
  },
  componentDidUpdate: function (prevProps, prevState) {
    if (prevState.apiKey != this.state.apiKey) 
    {
      if (prevState.intervalId) {
        clearInterval(prevState.intervalId);
      }
      this.loadEventsFromServer();
      intervalId = setInterval(this.loadEventsFromServer, this.props.pollInterval);
      this.setState({
        intervalId: intervalId
      });
    }
  },
  handleConfigSubmit: function(configEvent) {
    this.setState({
      apiKey: configEvent.apiKey,
      apiSecret: configEvent.apiSecret,
    });
  },
  getInitialState: function() {
    return {
      config: {},
      configError: null,
      apiKey: null,
      apiSecret: null,
      intervalId: null,
      data: []
    };
  },
  render: function() {
    return (
      <div className="EventBox">
        <h1>Mailjet Live Event API Dashboard</h1>
        <p>
          Created by <a href="https://twitter.com/arnaud_breton" target="_blank">Arnaud Breton</a>, Head of Developer Relations at <a href="https://mailjet.com" target="_blank">Mailjet</a>
        </p>
        <div className="container-fluid">
          <div className="col-md-6">
            <ConfigForm config={this.state.config} onEventSubmit={this.handleConfigSubmit} />
            <EventCallbackSetupForm  url={this.props.eventSetupUrl} apiKey={this.state.apiKey} apiSecret={this.state.apiSecret}/>
            <SendForm url={this.props.sendUrl} config={this.state.config} apiKey={this.state.apiKey} apiSecret={this.state.apiSecret} />
          </div>
          <div className="col-md-6">
            <EventList data={this.state.data} apiKey={this.state.apiKey}/>
          </div>
        </div>
      </div>
    );
  }
});

var EventList = React.createClass({
  render: function() {
    var EventNodes;
    if (!this.props.apiKey) {
      EventNodes = (function () {
        return (
          <h3>No API key configured</h3>
        );
      })();
    }
    else if (!this.props.data.length) {
      EventNodes = (function () {
        return (
          <h3>No event stored</h3>
        );
      })()
    }
    else {
      EventNodes = this.props.data.map(function(event, index) {
        return (
          // `key` is a React-specific concept and is not mandatory for the
          // purpose of this tutorial. if you're curious, see more here:
          // http://facebook.github.io/react/docs/multiple-components.html#dynamic-children
          <Event eventType={event.EventType} key={index}>
            {JSON.stringify(event.Payload)}
          </Event>
        );
      });
    }
    return (
      <div className="EventList">
        {EventNodes}
      </div>
    );
  }
});

var ConfigForm = React.createClass({
  mixins: [React.addons.LinkedStateMixin],
  handleSubmit: function(e) {
    e.preventDefault();
    var apiKey = React.findDOMNode(this.refs.apiKey).value.trim();
    var apiSecret = React.findDOMNode(this.refs.apiSecret).value.trim();
    if (!apiKey) {
      this.setState({error: "API key is mandatory"})
      return
    }

    if (!apiSecret) {
      this.setState({warning: "API secret is mandatory to send sample email"})
    }

    this.setState({error: null})
    this.props.onEventSubmit({
      apiKey: apiKey,
      apiSecret: apiSecret,
    });
  },
  componentDidUpdate: function (prevProps) {
    if (prevProps.config != this.props.config) {
      this.setState({
        apiKey: this.props.config.DefaultApiKey,
        apiSecret: this.props.config.DefaultApiSecret
      });
    }
  },
  getInitialState: function() {
    return {
      error: null,
      warning: null,
      apiKey: this.props.config.DefaultApiKey,
      apiSecret: this.props.config.DefaultApiSecret,
    }
  },
  render: function() {
    return (
      <section className="ConfigForm">
        <div className="alert alert-info">
          To start seeing events, please fill your <a href="https://app.mailjet.com/account/api_keys" target="_blank">Mailjet API key / secret.</a> <br/>
          <strong>The secret key is never stored by this application.</strong>
        </div>
        <form  onSubmit={this.handleSubmit}>
          <div className="form-group">
            <label htmlFor="apiKey">Mailjet API Key:</label>
            <input type="text" id="apiKey" ref="apiKey" valueLink={this.linkState('apiKey')} className="form-control"/>
            <label htmlFor="apiSecret">Mailjet API Secret:</label>
            <input type="text" id="apiSecret" ref="apiSecret" valueLink={this.linkState('apiSecret')} className="form-control" />
          </div>
          <button className="btn btn-default" type="submit">Set Credentials</button>
          {this.state.error ? <div className="alert alert-danger">{this.state.error}</div> : null }
          {this.state.warning ? <div className="alert alert-warning">{this.state.warning}</div> : null }
        </form>
      </section>
    );
  }
});

var EventCallbackSetupForm = React.createClass({
  mixins: [React.addons.LinkedStateMixin],
  defaultEvents: ["sent", "open", "click", "bounce", "blocked", "spam", "unsub"],
  componentDidUpdate: function (prevProps) {
    if (this.props.apiKey && this.props.apiSecret 
      && prevProps.apikey != this.props.apiKey
      && prevProps.apiSecret != this.props.apiSecret) {
      this.setState({
        eventUrl : this.getEventUrl(),
        disabled: false
      });
    }
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var eventType = React.findDOMNode(this.refs.eventType).value.trim();
    var url = React.findDOMNode(this.refs.url).value.trim();

    var payload = {
      ApiKey: this.props.apiKey,
      ApiSecret: this.props.apiSecret,
      EventType: eventType,
      CallbackUrl: url
    };

    this.setState({
      error: null,
      lastCallSuccess : null
    });

    $.ajax({
        url: this.props.url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(payload),
        success: function(data) { // callback method for further manipulations             
          console.log(data);

          this.setState({
            lastCallSuccess: true,
            error: null
          })
        }.bind(this),
        error: function(xhr, status, err) {
          this.setState({
            lastCallSuccess: false,
            error: xhr.responseText
          })
        }.bind(this)
      });
  },
  getEventUrl: function () {
    pathArray = location.href.split( '/' );
    protocol = pathArray[0];
    host = pathArray[2];
    baseUrl = protocol + '//' + host;

    var url;
    if (baseUrl.indexOf("localhost") > -1) {
      url = ""
    }
    else {
      url = baseUrl + "/events"
    }

    if (this.props.apiKey) {
      url += "?apikey=" + this.props.apiKey;
    }

    return url;
  },
  getInitialState: function() {
    return {
      disabled: true,
      lastCallSuccess: null, 
      error: null,
      defaultEventType: "sent",
      eventUrl: this.getEventUrl()
    }
  },
  renderEventRows: function() {
    var defaultEventType = this.state.defaultEventType;
    return this.defaultEvents.map(function(eventType, index) {
        return (
          <option value={eventType}>{eventType}</option>
        );
    });
  },
  render: function() {
    var disabled = this.state.disabled;

    eventRows = this.renderEventRows();

    return (
      <section className="EventCallbackSetupForm">
        <div className="alert alert-warning">
          This might override an already setup event callback url on your account.<br/>
          For testing purpose, please <a href="https://app.mailjet.com/account/api_keys" target="_blank">create a dedicated API key</a>. 
        </div>
        <form onSubmit={this.handleSubmit}>
          <div className="form-group">
            <label htmlFor="eventType">Event Type</label>
            <select ref="eventType" className="form-control" disabled={disabled} defaultValue={this.state.defaultEventType}>
              {eventRows}
            </select>
            <label htmlFor="url">URL</label>
            <input type="text" ref="url" placeholder="https://example.com" className="form-control" valueLink={this.linkState('eventUrl')} disabled={disabled}/>
          </div>
          <button className="btn btn-default" type="submit" disabled={disabled}>Setup EventCallbackUrl</button>
          {this.state.error ? <div className="alert alert-danger">{this.state.error}</div> : null }
          {this.state.lastCallSuccess ? <div className="alert alert-success">EventCallbackUrl setup!</div> : null }
        </form>
      </section>
    );
  }
});

var SendForm = React.createClass({
  mixins: [React.addons.LinkedStateMixin],
  handleSubmit: function(e) {
    e.preventDefault();
    var fromEmail = React.findDOMNode(this.refs.fromEmail).value.trim();
    var recipient = React.findDOMNode(this.refs.recipient).value.trim();
    var subject = React.findDOMNode(this.refs.subject).value.trim();
    var body = React.findDOMNode(this.refs.body).value.trim();

    var payload = {
      ApiKey: this.props.apiKey,
      ApiSecret: this.props.apiSecret,
      FromEmail: fromEmail,
      Recipient: recipient,
      Subject: subject,
      Body: body
    }

    this.setState({
      error: null,
      lastCallSuccess : null
    });

    $.ajax({
        url: this.props.url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(payload),
        success: function(data) { // callback method for further manipulations             
          console.log(data);

          this.setState({lastCallSuccess : true, error: null});
        }.bind(this),
        error: function(xhr, status, err) {
          this.setState({
            lastCallSuccess: false,
            error: xhr.responseText
          })
        }.bind(this)
      });
  },
  getInitialState: function() {
    return {
      disabled: true,
      lastCallSuccess: null,
      error: null,
      recipient: null,
      subject: null,
      body: null,
    }
  },
  componentDidUpdate: function (prevProps, prevState) {
    var changed, recipient, disabled, subject, body;

    recipient = prevState.recipient
    subject = prevState.subject
    body = prevState.body
    changed = false;
    disabled = true;
    if (this.props.apiKey && this.props.apiSecret 
      && prevProps.apikey != this.props.apiKey
      && prevProps.apiSecret != this.props.apiSecret) {
      disabled = false;
      changed = true;
    }

    if(prevProps.config != this.props.config) {
      recipient = this.props.config.DefaultRecipient
      subject = this.props.config.DefaultSubject
      body = this.props.config.DefaultBody
      changed = true;
    }

    if (changed) {
      this.setState({
        disabled: disabled,
        recipient: recipient,
        subject: subject,
        body: body
      })
    }
  },
  render: function() {
    var disabled = this.state.disabled
    return (
      <section>
        <form className="SendForm" onSubmit={this.handleSubmit}>
          <div className="form-group">
            <label htmlFor="fromEmail">From email (<a href="https://app.mailjet.com/account/sender">valid Mailjet sender</a>)</label>
            <input type="text" placeholder="api@mailjet.com" id="fromEmail" ref="fromEmail" className="form-control" disabled={disabled}/>
            <label htmlFor="recipient">To</label>
            <input type="text" placeholder="api@mailjet.com" id="recipient" ref="recipient" placeholder="Optional, default to from" className="form-control" disabled={disabled} valueLink={this.linkState('recipient')} />
            <label htmlFor="subject">Subject</label>
            <input type="text" placeholder="Hello World!" id="subject" ref="subject" className="form-control" disabled={disabled} valueLink={this.linkState('subject')} />
            <label htmlFor="body">Subject</label>
            <textarea placeholder="Say something..." id="body" ref="body" className="form-control" disabled={disabled} valueLink={this.linkState('body')}></textarea>
          </div>
          <button className="btn btn-default" type="submit" disabled={disabled}>Send!</button>
          {this.state.error ? <div className="alert alert-danger">{this.state.error}</div> : null }
          {this.state.lastCallSuccess ? <div className="alert alert-success">Sent!</div> : null }
        </form>
      </section>
    );
  }
});

React.render(
  <EventBox eventsUrl="events" sendUrl="messages" eventSetupUrl="events/setup" configUrl="config" pollInterval={2000} />,
  document.getElementById('content')
);
