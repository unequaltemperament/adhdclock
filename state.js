export {State,NotStarted,Running,Paused,Expired}

class State{
    constructor(ctx){
        this.context = ctx
    }
    color = TimerColors.Work;

    toString() {return this.timerStatus}
    [Symbol.toPrimitive](hint){
        return this.timerStatus
    }
    get [Symbol.toStringTag](){ return this.timerStatus}
    enter(){ console.log(`entering states.${this.timerStatus}`)}
    start(){ console.log("start")}
	pause(){ console.log("pause")}
	skip (){ console.log("skip")}
	expire(){ console.log("expire")}
}

class NotStarted extends State {
	color = TimerColors.Work
	timerStatus = Status.NotStarted
    start(){ createTimer()}
}

class Running extends State {
    constructor(ctx){
        super(ctx);
        if(currentBlock){
            this.color = TimerColors[currentBlock.type]
        }
    }
    color = TimerColors.Work;
	timerStatus = Status.Running;
	start(){createTimer();color = TimerColors[currentBlock.type]}
	// skip:  state.skip(),
	// expire: state.expire()

    enter(){super.enter();this.start()}
	pause(){
		timerStatus = Status.Paused;
		select("#pauseButton").html("Resume");
		clearInterval(timer);
	}
}

class Paused extends State {
	color = TimerColors[currentBlock.type]
	timerStatus = Status.Paused
	 start(){
		select("#pauseButton").html("Pause");
		startTimer();
	 }
	// pause: state.pause(),
	// skip:  state.skip(),
	// expire: state.expire()
}

class Expired extends State {
	color = TimerColors.Expired
	timerStatus = Status.Expired
	start(){createTimer()}
	// pause: state.pause(),
	// skip:  state.skip(),
	// expire: state.expire()
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