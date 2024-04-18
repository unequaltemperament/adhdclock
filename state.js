class Status {
	static NotStarted = "NotStarted";
	static Running = "Running";
	static Paused = "Paused";
	static Expired = "Expired";
} //Status

class stateManager {
    constructor(st){
        if(st){
            console.debug(`Initializing new stateManager with ${st}`)
            this.state = st;
        }
        else{
            console.debug(`No state passed in, initializing stateManager with NotStartedState`)
            this.state= NotStartedState
        }
    }
	_state;

	set state(st) {
		if (!(this._state instanceof st)) {
			this._state = new st(this);
			this.enter();
		}
		else{
			console.warn(`Already in ${this._state}State`)
		}
		return this
	}

	get state(){return this._state.status}

	enter= function(){this._state.enter()}
	start= function(){this._state.start()}
    pause= function(){this._state.pause()}

}

class BaseState{
    constructor(ctx){
        this.context = ctx
    }

    color = TimerColors.Work;
    static timerStatus = "Uninitialized";

    static get status(){
        return this.timerStatus
    }

    get status(){
        return `${this.constructor}`
    }

    static toString(){return this.timerStatus}

    toString() {return `${this.constructor}`}

    static [Symbol.toPrimitive](hint){
        switch(hint){
            case "string":
            case "default":
                return this.timerStatus;
            case "number":
                console.log("Attempted to convert state to numeric value, currently not implemented");
        }
        return null;
    }

    [Symbol.toPrimitive](hint){
        return `${this.constructor}`
    }

    static get [Symbol.toStringTag](){return this.timerStatus}
    get [Symbol.toStringTag](){ return `${this.constructor[Symbol.toStringTag]}` }

    enter(){ console.debug(`entering ${this.status}State`)}
    start(){ console.debug("start")}
	pause(){ console.debug("pause")}
	skip (){ console.debug("skip")}
	expire(){ console.debug("expire")}
}

class NotStartedState extends BaseState {
    static timerStatus = Status.NotStarted
    color = TimerColors.Work
    

    start(){ createTimer()}
}

class RunningState extends BaseState {
    constructor(ctx){
        super(ctx);
        this.color = currentBlock ? TimerColors[currentBlock.type] : TimerColors.Work
    }

    static timerStatus = Status.Running

	start(){createTimer();color = TimerColors[currentBlock.type]}
    enter(){super.enter();this.start()}
/* 	pause(){
		timerStatus = Status.Paused;
		select("#pauseButton").html("Resume");
		clearInterval(timer);
	} */
}

class PausedState extends BaseState {
    constructor(ctx){
        super(ctx);
        this.color = currentBlock ? TimerColors[currentBlock.type] : TimerColors.Work
    }

    static timerStatus = Status.Paused
	/* start(){
		select("#pauseButton").html("Pause");
	    startTimer();
	} */

}

class ExpiredState extends BaseState {

    color = TimerColors.Expired
    static timerStatus = Status.Expired

}

////////////////////////////////////
/* function expired() {
	if (timerStatus != Status.Expired) {
		timerStatus = Status.Expired;
		clearInterval(timer);
		clearInterval(expiredTimer);
		remainingTime = 0;
		currentBlock = null;
		//TODO: currently buggy if expired() is called multiple times
		//color can get stuck on TimerColors.Expired
		//since toggleBackToColor gets set to the same color as as onColor
		//Fixed for now (lol) by checking in expired() to see if we are currently expired
		//But real state management would be a good idea (separation of concerns or something)
		let toggleBackToColor = onColor;
		onColor = TimerColors.Expired;
		expiredTimer = setInterval(() => {
			onColor == toggleBackToColor
				? (onColor = TimerColors.Expired)
				: (onColor = toggleBackToColor);
			updateCanvas();
		}, 420);
		updateCanvas();
	}
} //expired()


function restartTimer() {
	select("#pauseButton").html("Pause");
	if (currentBlock) {
		timerStatus = Status.Running;
		if (timer) clearInterval(timer);
		if (expiredTimer) clearInterval(expiredTimer);
		createTimer(currentBlock);
	}
	updateCanvas();
} //restartTimer() */
////////////////////////////////////