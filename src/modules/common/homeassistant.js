export class Homeassistant {

    constructor(url, accessToken, onReady, onError, onClose) {
        this.requests = new Map()
        this.requestIdSequence = 1
        this.websocket = new WebSocket(url)
        this.accessToken = accessToken;
        this.onReady = onReady;
        this.onError = onError;

        this.websocket.onmessage = (evt) => this.handleMessage(evt);
        this.websocket.onerror = () => { this.onError("Failed to connect to " + url) };
        this.websocket.onclose = onClose;
    }

    close() {
        this.websocket.onclose = null;
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.close();
        }
    }

    handleMessage(msg) {
        let messageData = JSON.parse(msg.data);

        switch (messageData.type) {
            case "auth_required":
                this.sendAuthentication();
                break;
            case "result":
                if (this.requests.has(messageData.id)) {
                    this.requests.get(messageData.id)(messageData.result);
                }
                break;
            case "event":
                if (this.requests.has(messageData.id)) {
                    this.requests.get(messageData.id)(messageData.event);
                }
                break;
            case "auth_ok":
                if (this.onReady) {
                    this.onReady();
                }
                break;
            case "auth_failed":
                if (this.onError) {
                    this.onError(messageData.message);
                }
                break;
            case "auth_invalid":
                if (this.onError) {
                    this.onError(messageData.message);
                }
                break;
        }
    }

    sendAuthentication() {
        let authMessage = {
            "type": "auth",
            "access_token": this.accessToken
        }

        this.websocket.send(JSON.stringify(authMessage))
    }

    getStates(callback) {
        let getStatesCommand = new GetStatesCommand(this.nextRequestId());
        this.sendCommand(getStatesCommand, callback);
    }

    getServices(callback) {
        let getServicesCommand = new GetServicesCommand(this.nextRequestId());
        this.sendCommand(getServicesCommand, callback)
    }

    subscribeEvents(callback) {
        let subscribeEventCommand = new SubscribeEventCommand(this.nextRequestId());
        this.sendCommand(subscribeEventCommand, callback);
    }

    callService(service, domain, serviceData, callback = null) {
        let callServiceCommand = new CallServiceCommand(this.nextRequestId(), service, domain, serviceData);
        this.sendCommand(callServiceCommand, callback)
    }

    sendCommand(command, callback) {
        if (callback) {
            this.requests.set(command.id, callback);
        }
        this.websocket.send(JSON.stringify(command));
    }

    nextRequestId() {
        this.requestIdSequence = this.requestIdSequence + 1;
        return this.requestIdSequence;
    }

}

class Command {
    constructor(requestId, type) {
        this.id = requestId;
        this.type = type;
    }
}

class SubscribeEventCommand extends Command {
    constructor(interactionCount) {
        super(interactionCount, "subscribe_events");
        this.event_type = "state_changed";
    }
}

class GetStatesCommand extends Command {
    constructor(iterationCount) {
        super(iterationCount, "get_states");
    }
}

class GetServicesCommand extends Command {
    constructor(iterationCount) {
        super(iterationCount, "get_services");
    }
}

class CallServiceCommand extends Command {
    constructor(iterationCount, service, domain, serviceData) {
        super(iterationCount, "call_service");
        this.domain = domain;
        this.service = service;
        if (serviceData) {
            this.service_data = serviceData;
        }
    }
}

export class Entity {

    constructor(entityId) {
        this.entityId = entityId
        this.domain = entityId.split(".")[0];
        this.name = entityId.split(".")[1];
    }

}
