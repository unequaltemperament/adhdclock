"use strict";
//export {frameVis, drawProgressBar, updateStatusText, updateTimerDisplay, updateCanvas, drawSegment, drawSevenSegment, createTimer, startTimer, clearTimer, keyPressed, Pomodoro, drawButtons };
//import {Status,stateManager,BaseState,NotStartedState,RunningState,PausedState,ExpiredState,restartTimer,TimerColors}  from "./state.js";
window.p5.disableFriendlyErrors = true;

class TimerColors {
	static Work = "#ffef33";
	static Break = "#58ff33";
	static Expired = "#FF5500";
	static Off = "#454545"; //"#282828";
} //TimerColors

class TimerGlowColors {
	static Work = "#ba8500";
	static Break = "green";
	static Expired = "red";
} //TimerGlowColors

class TimerTypes {
	static WorkTimer = "Work";
	static BreakTimer = "Break";
} //TimerTypes

class TimerBlock {
	constructor(duration = 3600, type = TimerTypes.WorkTimer) {
		this.duration = duration;
		this.type = type;
	}
} //TimerBlock

class States {
	static NotStarted = NotStartedState;
	static Running = RunningState;
	static Paused = PausedState;
	static Expired = ExpiredState;
}

const timerQueue = new Array();
Object.defineProperty(timerQueue, "duration", { get() { return this.reduce((a, c) => a + c.duration, 0);} });
Object.defineProperty(timerQueue, "isEmpty", { get() { return this.length===0;}});

timerQueue.queue = function (...blocks) {
	this.push(...blocks);
	updateStatusText();
};

timerQueue.queueFront = function (...blocks) {
	this.unshift(...blocks);
	//TODO: why is this commented out? 
	//updateStatusText();
};




let manager;

let cnv;
let pg;
let onColor;

let remainingTime=0;
let timeWorked = 0;
let timer;
let expiredTimer;
let currentTimerBlock;

const boxWidth = 150;
const boxHeight = 250;
const segmentLongDim = 80; //80
const segmentShortDim = 12; //12
const triHeight = segmentShortDim / 2; // 2
const gap = 2; //2
const numSegments = 5;

//		  | bitmasks for each numeral's required segments
//    A   | 1's & capitals indicates a lit segment:
//	 F B  |	0x7e = 1111110 = ABCDEFg | 0x33 = 0110011 = aBCdeFG
//    G   |							 |
//	 E C  |			|‾|				 |			 | |
//	  D   |			| |				 |			  ‾|
//		  |			 ‾			 	 |
const litSegmentMask = [
	0x7e, 0x30, 0x6d, 0x79, 0x33, 0x5b, 0x5f, 0x70, 0x7f, 0x7b,
];

const segmentData = {
	//clockwise winding from (left || top) triangle point
	vertices: [
		{ x: 0, y: 0 },
		{ x: triHeight, y: -triHeight },
		{ x: triHeight + segmentLongDim, y: -triHeight },
		{ x: triHeight + segmentLongDim + triHeight, y: 0 },
		{ x: triHeight + segmentLongDim, y: segmentShortDim - triHeight },
		{ x: triHeight, y: segmentShortDim - triHeight },
	],

	transforms: {
		//draw order + cumulative translations
		A: { x: 0, y: 0 },
		G: { x: 0, y: segmentLongDim + triHeight * 2 + gap * 2 },
		D: { x: 0, y: segmentLongDim + triHeight * 2 + gap * 2 },

		E: { x: -(segmentLongDim + triHeight * 2 + gap), y: 0 },
		F: { x: -(segmentLongDim + triHeight * 2 + gap * 2), y: 0 },

		B: { x: 0, y: -(segmentLongDim + triHeight * 2) },
		C: { x: segmentLongDim + triHeight * 2 + gap * 2, y: 0 },
	},
};

//TODO: properly integrate updateCanvas()
window.setup=function() {
	document.styleSheets[0].insertRule("body { overflow:hidden }");
	cnv = createCanvas(800, 300).style("display", "block");
	frameRate(60);
	pg = createGraphics(1200, 450);
	pg.textSize(20);
	pg.noStroke();
	pg.textFont("monospace");
	pg.angleMode(DEGREES);

	drawButtons();

	manager = new stateManager(States.NotStarted);
	//manager.enter();
	//updateCanvas();
	//manager.start();
	//createTimer();
} //setup()

window.draw=function() {
	background(50);
	image(pg, 0, 0, cnv.width, cnv.height);
	drawProgressBar();
	frameVis();
} //draw()


function frameVis(){
	const f = getTargetFrameRate();
	const w = cnv.width / 2;
	const visPerc = ((frameCount % f)/(f-1));
	push();
	stroke(255);
	strokeWeight(1);
	line(w - w/2, cnv.height-20, w-w/2, cnv.height-10);
	line(w + w/2, cnv.height-20, w+w/2, cnv.height-10);
	fill("red");
	noStroke();
	rect(w-w/2,cnv.height-20,w*visPerc,10);
	pop();

	//if(frameCount==f)	{createTimer();startTimer();}
}

function drawProgressBar(){
	if(currentTimerBlock){
		push();
		//TODO: lerp this
		const progress = (currentTimerBlock.duration - remainingTime) / (currentTimerBlock.duration);
		const barEnd = progress * boxWidth * numSegments *(cnv.width/pg.width);
		noStroke();
		noSmooth();
		fill(onColor);
		rect(0,0,barEnd,triHeight);
		pop();
	}
} 

function updateStatusText(x) {
	//x is only passed for NotStartedState.enter()'s startup
	//to access manager status during canvas initialization
	//TODO: save all canvas updates until all state is initialized
	//or enter state after manager and canvas are both initialized
	if(!x) x=manager;
	const workStatusTextLocation = numSegments * boxWidth + 10;
	let workStatusTextLineNumber = 1;
	pg.fill(50);
	pg.rect(workStatusTextLocation, 0, pg.width - workStatusTextLocation, pg.height);
	pg.fill(255);
	pg.text(x.state, workStatusTextLocation, pg.textSize() * workStatusTextLineNumber++);
	pg.text(
		`Total time worked: ${timeWorked}`,
		workStatusTextLocation,
		pg.textSize() * workStatusTextLineNumber++,
	);

	const cbText = currentTimerBlock
		? `${currentTimerBlock.type} for ${currentTimerBlock.duration}`
		: ``;
		
	pg.text(
		`Current block: ${cbText}`,
		workStatusTextLocation, pg.textSize() * workStatusTextLineNumber++,
	);

	pg.text(
		`${timerQueue.length} queued block${timerQueue.length != 1 ? "s" : ""}`,
		workStatusTextLocation, pg.textSize() * workStatusTextLineNumber++,
	);

	pg.text(`${timerQueue.duration} total time`,
		workStatusTextLocation, pg.textSize() * workStatusTextLineNumber++
	);

	for (let i = 0; i < timerQueue.length; i++) {
		pg.fill(TimerColors[timerQueue[i].type]);
		pg.text(
			timerQueue[i].duration,
			workStatusTextLocation, pg.textSize() * workStatusTextLineNumber++,
		);
	}
} //updateStatustext()

function updateTimerDisplay() {
	const digits = remainingTime.toString().padStart(numSegments, "0");

	pg.fill(30);
	pg.push();
		
	//R-to-L
	for (let i = numSegments - 1; i >= 0; i--) {
		pg.push();
		pg.translate(i * boxWidth, 0);
		drawSevenSegment(digits[i]);
		pg.pop();
	}
	pg.pop();
} //updateTimerDisplay()

function updateCanvas(x) {
 	updateStatusText(x);
	updateTimerDisplay(); 
	
} //updateCanvas()

//TODO: find settings that give the "burny edge" effect and aren't zoom-dependent
function drawSegment(segment, lit) {
	const verts = segmentData.vertices;
	const transform = segmentData.transforms[segment];

	pg.translate(transform.x, transform.y);

	if (lit) {
		pg.push();
		let glowColor = TimerGlowColors.Work;
		switch(onColor){
		//TODO: get good glow colors
		case TimerColors.Break:
			glowColor = TimerGlowColors.Break;
			break;
		case TimerColors.Expired:
			glowColor = TimerGlowColors.Expired;
			break;
		}
		pg.fill(glowColor);
		pg.beginShape();

		//blur is maybe causing performance problems
		//but it may also simply being called too often

		//TODO: look into only drawing changed segments
		//or draw lit segments in a batch, or both
		//pg.drawingContext.filter = "blur(4px)"
		for (const v of verts) {
			pg.vertex(v.x, v.y);
		}
		pg.endShape(CLOSE);
		pg.pop();
	}

	pg.blendMode(OVERLAY);
	lit == 1 ? pg.fill(onColor) : pg.fill(TimerColors.Off);
	pg.beginShape();
	for (const v of verts) {
		pg.vertex(v.x, v.y);
	}
	pg.endShape(CLOSE);
	pg.blendMode(BLEND);
} //drawSegment()

function drawSevenSegment(numeralToDraw) {
	pg.rect(0, 0, boxWidth, boxHeight);
	const startX = boxWidth / 2 - segmentLongDim / 2 - triHeight;
	const startY = boxHeight / 2 - triHeight * 2 - segmentLongDim - gap * 2;
	pg.push();
	pg.translate(startX, startY);
	drawSegment("A", (litSegmentMask[numeralToDraw] >> 6) & 1);
	drawSegment("G", (litSegmentMask[numeralToDraw] >> 0) & 1);
	drawSegment("D", (litSegmentMask[numeralToDraw] >> 3) & 1);
	pg.rotate(90);
	drawSegment("E", (litSegmentMask[numeralToDraw] >> 2) & 1);
	drawSegment("F", (litSegmentMask[numeralToDraw] >> 1) & 1);
	drawSegment("B", (litSegmentMask[numeralToDraw] >> 5) & 1);
	drawSegment("C", (litSegmentMask[numeralToDraw] >> 4) & 1);
	pg.pop();
} //drawSevenSegment()


function loadTimerBlock(time) {
	
	//time can be an int or a TimerBlock
	//shift() on empty array returns undefined, will default to new TimerBlock(defaultArg)
	if (!time) {time = timerQueue.shift();}
	if (!(time instanceof TimerBlock)) time = new TimerBlock(time);

	try{
		if( time.duration.toString().length > numSegments){
			throw new RangeError(`Input time contains too many digits, new Timer not created`);
		}
	}
	catch(e){
		debugger;
		console.error(e);
		return false;
	}
	currentTimerBlock = time;
	remainingTime = currentTimerBlock.duration;

	updateCanvas();
} //loadTimerBlock()

function tickTimer(){

	remainingTime--;
	manager.tickedAt = Date.now(); 	

	if (currentTimerBlock.type == TimerTypes.WorkTimer) {
		timeWorked++;
	}

	if (remainingTime === 0) {
		if (!timerQueue.isEmpty) {
			loadTimerBlock(timerQueue.shift());
			manager.start();
		} else {
			manager.expire();
		}
	}
	updateCanvas();
}

function startTimer(partialInterval) {

	if (timer) clearInterval(timer);
	if (expiredTimer) clearInterval(expiredTimer);

	timer = null;
	expiredTimer = null;

	manager.tickedAt = Date.now();

	if (typeof partialInterval === "number" && partialInterval > 0) {
		timer = setTimeout( () => {
			tickTimer();
			timer = setInterval(() => {
				tickTimer();
			}, 1000);}
		, partialInterval)
	}

	else{
		timer = setInterval(() => {
			tickTimer();
		}, 1000)
	}
	
	updateCanvas();
} //startTimer()

function keyPressed() {
	let inputTime = 0;
	if (keyCode >= 49 && keyCode <= 57) {
		inputTime = keyCode - 48;
		loadTimerBlock(inputTime);
		startTimer();
	}
	/*if (keyCode == 32) {
		//(inclusive,exclusive)
		inputTime = floor(random(1000, 100000));
		createTimer(inputTime);
		return false;
	}*/
} //keyPressed()

function Pomodoro() {
	timerQueue.queue(new TimerBlock(5 * 5 * 60, TimerTypes.WorkTimer));
	timerQueue.queue(new TimerBlock(1 * 5 * 60, TimerTypes.BreakTimer));

	timerQueue.queue(new TimerBlock(5 * 5 * 60, TimerTypes.WorkTimer));
	timerQueue.queue(new TimerBlock(1 * 5 * 60, TimerTypes.BreakTimer));

	timerQueue.queue(new TimerBlock(5 * 5 * 60, TimerTypes.WorkTimer));
	timerQueue.queue(new TimerBlock(1 * 5 * 60, TimerTypes.BreakTimer));

	timerQueue.queue(new TimerBlock(5 * 5 * 60, TimerTypes.WorkTimer));
	timerQueue.queue(new TimerBlock(1 * 5 * 60, TimerTypes.BreakTimer));

	timerQueue.queue(new TimerBlock(6 * 5 * 60, TimerTypes.BreakTimer));
}

function drawButtons() {

	const buttonA = createButton("Clear").id("clearButton");
	buttonA.position(330, 175);
	buttonA.mousePressed(() => {
		manager.state=States.NotStarted;
	});

	const buttonB = createButton("Pause").id("pauseButton");
	buttonB.position(330, 198);
	buttonB.mousePressed(() => {
		manager.pause();
	});

	const buttonC = createButton("Restart");
	buttonC.position(330, 221);
	buttonC.mousePressed(() => {
		if(currentTimerBlock){
			timerQueue.queueFront(currentTimerBlock)
			currentTimerBlock = null;
			manager.start()
		}
	});

	const buttonD = createButton("Start");
	buttonD.position(410, 175);
	buttonD.mousePressed(() => {
		manager.start();
	});

	const buttonE = createButton("Skip Current");
	buttonE.position(410, 198);
	buttonE.mousePressed(() => {
		//nothing to skip if !currentTimerBlock
		if (currentTimerBlock) {
			if(timerQueue.isEmpty){
				manager.expire();
			}
			else{
				currentTimerBlock = null;
				manager.start();
			}
		}
	});

	const buttonF = createButton("Queue 🍅");
	buttonF.position(410, 221);
	buttonF.mousePressed(() => {
		Pomodoro();
	});

	const buttonG = createButton("Clear Queue");
	buttonG.position(410, 244);
	buttonG.mousePressed(() => {
		timerQueue.length = 0;
		updateCanvas();
	})

	const button1 = createButton("4 hours");
	button1.position(10, 175);
	button1.mousePressed(() => {
		const inputTime = 4 * 60 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button2 = createButton("3 hours");
	button2.position(10, 198);
	button2.mousePressed(() => {
		const inputTime = 3 * 60 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button3 = createButton("2 hours");
	button3.position(10, 221);
	button3.mousePressed(() => {
		const inputTime = 2 * 60 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button4 = createButton("1 hours");
	button4.position(10, 244);
	button4.mousePressed(() => {
		const inputTime = 1 * 60 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button5 = createButton("45 min");
	button5.position(90, 175);
	button5.mousePressed(() => {
		const inputTime = 45 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button6 = createButton("30 min");
	button6.position(90, 198);
	button6.mousePressed(() => {
		const inputTime = 30 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button7 = createButton("15 min");
	button7.position(90, 221);
	button7.mousePressed(() => {
		const inputTime = 15 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button8 = createButton("10 min");
	button8.position(90, 244);
	button8.mousePressed(() => {
		const inputTime = 10 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button9 = createButton("&nbsp;&nbsp;5 min");
	button9.position(170, 175);
	button9.mousePressed(() => {
		const inputTime = 5 * 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button10 = createButton("&nbsp;&nbsp;1 min");
	button10.position(170, 198);
	button10.mousePressed(() => {
		const inputTime = 60;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const buttonAdd1 = createButton("&nbsp;+5 min");
	buttonAdd1.position(170, 221);
	buttonAdd1.mousePressed(() => {
		let inputTime = 60 * 5
		const rem = remainingTime + inputTime
		if(currentTimerBlock){
			inputTime = new TimerBlock(currentTimerBlock.duration + inputTime,currentTimerBlock.type)
		}
		loadTimerBlock(inputTime)
		remainingTime = rem
		updateCanvas();
		manager.state = States.Running
	});

	const buttonAdd2 = createButton("&nbsp;+1 min");
	buttonAdd2.position(170, 244);
	buttonAdd2.mousePressed(() => {
		let inputTime = 60
		const rem = remainingTime + inputTime
		if(currentTimerBlock){
			inputTime = new TimerBlock(currentTimerBlock.duration + inputTime,currentTimerBlock.type)
		}
		loadTimerBlock(inputTime)
		remainingTime = rem
		updateCanvas();
		manager.state = States.Running;
	});

	const button11 = createButton("45 sec");
	button11.position(250, 175);
	button11.mousePressed(() => {
		const inputTime = 45;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button12 = createButton("30 sec");
	button12.position(250, 198);
	button12.mousePressed(() => {
		const inputTime = 30;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button13 = createButton("15 sec");
	button13.position(250, 221);
	button13.mousePressed(() => {
		const inputTime = 15;
		loadTimerBlock(inputTime);
		manager.start();
	});

	const button14 = createButton("2 sec");
	button14.position(250, 244);
	button14.mousePressed(() => {
		const inputTime = 2;
		loadTimerBlock(inputTime);
		manager.start();
	});
}