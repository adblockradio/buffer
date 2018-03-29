import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));

var isCordovaApp = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;

if (!isCordovaApp) {
	registerServiceWorker();
}

/*window["isUpdateAvailable"].then(isAvailable => {
	if (isAvailable) {
		console.log("refresh to get new content");
	}
});*/
