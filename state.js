//export {Status,stateManager,BaseState,NotStartedState,RunningState,PausedState,ExpiredState,restartTimer};

class Status {
	static NotStarted = "NotStarted";
	static Running = "Running";
	static Paused = "Paused";
	static Expired = "Expired";
} //Status

class stateManager {
	constructor(st){
		if(st){
			console.debug(`Initializing new stateManager with ${st}`);
			this.state = st;
		}
		else{
			console.debug(`No state passed in, initializing stateManager with NotStartedState`);
			this.state= States.NotStarted;
		}
	}
	_state;

	tickedAt;
	elapsedInterval;
	remainingInterval;

	set state(st) {
		if (!(this._state instanceof st)) {
			if(this._state){
				this.exit();
			}

			this._state = new st(this);
			console.debug(`stateManager: Entering ${this.state}State`);
			this.enter();
			updateCanvas(this);
		}

		else{
			console.warn(`Already in ${this._state}State`);
		}
	}

	get [Symbol.toStringTag](){return this.constructor.name;}
	toString() {return this.constructor.name;}

	get state(){return this._state.status;}

	enter= function(){this._state.enter();};
	exit= function(){this._state.exit();}
	start= function(){this._state.start();};
	pause= function(){this._state.pause();};
	//TODO: implement skip() and expire() properly;
	skip= function(){this._state.skip();};
	expire= function(){this._state.expire();};


}

class BaseState{
	constructor(ctx){
		this.context = ctx;
	}

	color = TimerColors.Work;
	static timerStatus = "Uninitialized";

	static elapsedInterval = 0;
	static remainingInterval = 0;

	static get status(){return this.timerStatus;}
	static get [Symbol.toStringTag](){return `${this.status}State`;}
	static toString(){return this.status;}

	get status(){return this.constructor.status;}
	get [Symbol.toStringTag](){return this.constructor[Symbol.toStringTag];}
	toString() {return this.constructor.toString();}

	enter (){ console.debug(`BaseState enter`);}
	exit  (){ console.debug(`BaseState exit`);}
	start (){ console.debug("BaseState start");}
	pause (){ console.debug("BaseState pause");}
	skip  (){ console.debug("BaseState skip");}
	expire(){ console.debug("BaseState expire");}
}

class NotStartedState extends BaseState {
	static timerStatus = Status.NotStarted;
	color = TimerColors.Work;
    
	enter(){
		remainingTime = 0;
		currentTimerBlock = null;
		select("#pauseButton").html("Pause");
		if (timer) clearInterval(timer);
		timer = null;
		if (expiredTimer) clearInterval(expiredTimer);
		expiredTimer = null;
		onColor = this.color;
	}

	start(){ this.context.state=States.Running;}
}

class RunningState extends BaseState {
	constructor(ctx){
		super(ctx);
		this.color = currentTimerBlock ? TimerColors[currentTimerBlock.type] : TimerColors.Work;
		onColor = this.color
	}
	
	static timerStatus = Status.Running;
	
	enter(){
		this.start();
	}

	start(){
		if (!currentTimerBlock) {
			loadTimerBlock();
		}

		this.color = TimerColors[currentTimerBlock.type];
		onColor = this.color;

		if(!timer){
		startTimer(this.context.remainingInterval);
		this.context.remainingInterval = 0;
		}
	}
	
 	pause(){
		this.context.state = States.Paused
	}
	
	expire(){
		this.context.state=States.Expired
	}
}

class PausedState extends BaseState {

	static timerStatus = Status.Paused;


	enter(){
		clearInterval(timer);
		timer = null;
		select("#pauseButton").html("Resume");
		this.context.elapsedInterval = Date.now() - this.context.tickedAt
		this.context.remainingInterval = 1000 - this.context.elapsedInterval
	}

	exit(){
		select("#pauseButton").html("Pause");
	}

	start(){
	    this.context.state = States.Running
	}

	//TODO: lol
	pause(){
		this.start()
	}

}

class ExpiredState extends BaseState {

	color = TimerColors.Expired;
	static timerStatus = Status.Expired;

	enter(){
		clearInterval(timer);
		timer = null;
		clearInterval(expiredTimer);
		expiredTimer = null;
		remainingTime = 0;
		currentTimerBlock = null;

		let toggleBackToColor = onColor;
		onColor = this.color;
		expiredTimer = setInterval(() => {
			onColor == toggleBackToColor
				? (onColor = this.color)
				: (onColor = toggleBackToColor);
			updateCanvas();
		}, 420);
	}

	start(){
		this.context.state = States.Running
	}

	pause(){}
}