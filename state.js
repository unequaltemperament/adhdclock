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

	set state(st) {
		if (!(this._state instanceof st)) {
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
	start= function(){this._state.start();};
	pause= function(){this._state.pause();};

}

class BaseState{
	constructor(ctx){
		this.context = ctx;
	}

	color = TimerColors.Work;
	static timerStatus = "Uninitialized";

	static get status(){return this.timerStatus;}
	static get [Symbol.toStringTag](){return `${this.status}State`;}
	static toString(){return this.status;}

	get status(){return this.constructor.status;}
	get [Symbol.toStringTag](){return this.constructor[Symbol.toStringTag];}
	toString() {return this.constructor.toString();}

	enter (){ console.debug(`BaseState enter`);}
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
		currentBlock = null;
		select("#pauseButton").html("Pause");
		if (timer) clearInterval(timer);
		if (expiredTimer) clearInterval(expiredTimer);
		onColor = TimerColors.Work;
	}
	start(){ this.context.state=States.Running;}
}

class RunningState extends BaseState {
	constructor(ctx){
		super(ctx);
		this.color = currentBlock ? TimerColors[currentBlock.type] : TimerColors.Work;
	}
	
	static timerStatus = Status.Running;

	start(){createTimer();color = TimerColors[currentBlock.type];}
	enter(){this.context.start();}
/* 	pause(){
		timerStatus = Status.Paused;
		select("#pauseButton").html("Resume");
		clearInterval(timer);
	} */
}

class PausedState extends BaseState {
	constructor(ctx){
		super(ctx);
		this.color = currentBlock ? TimerColors[currentBlock.type] : TimerColors.Work;
	}

	static timerStatus = Status.Paused;
	/* start(){
		select("#pauseButton").html("Pause");
	    startTimer();
	} */

}

class ExpiredState extends BaseState {

	color = TimerColors.Expired;
	static timerStatus = Status.Expired;

	enter(){
		clearInterval(timer);
		clearInterval(expiredTimer);
		remainingTime = 0;
		currentBlock = null;
		//TODO: sniff through this
		let toggleBackToColor = onColor;
		onColor = TimerColors.Expired;
		expiredTimer = setInterval(() => {
			onColor == toggleBackToColor
				? (onColor = TimerColors.Expired)
				: (onColor = toggleBackToColor);
			updateCanvas();
		}, 420);
	}

}

////////////////////////////////////
function restartTimer() {
	select("#pauseButton").html("Pause");
	if (currentBlock) {
		if (timer) clearInterval(timer);
		if (expiredTimer) clearInterval(expiredTimer);
		createTimer(currentBlock);
	}
	updateCanvas();
} //restartTimer() */
////////////////////////////////////