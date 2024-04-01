"use strict";
let cnv;

class Status {
	static NotStarted = "NotStarted";
	static Running = "Running";
	static Paused = "Paused";
	static Expired = "Expired";
}//Status

class TimerColors {
	static Work = "#ffef33";
	static Expired = "#FF5500";
	static Break = "#58ff33";
	static Off = "#282828"//"#454545";
}//TimerColors

class TimerTypes {
	static WorkTimer = "Work";
	static BreakTimer = "Break";
}//TimerTypes

class TimerBlock {
	constructor(blockDuration = 3600, blockType = TimerTypes.WorkTimer){
		this.blockDuration = blockDuration;
		this.blockType = blockType;
	}
}//TimerBlock

const boxWidth = 150;
const boxHeight = 250;
const segmentLongDim = 80; //80
const segmentShortDim = 12; //12
const triHeight = segmentShortDim / 2; // 2
const gap = 2; //2
const numSegments = 5;
let onColor = TimerColors.Work;

let remainingTime = 0;
let timerBlocks = [];
let timeWorked = 0;

let timer;
let expiredTimer;

let status = Status.NotStarted;
let currentTimerType = TimerTypes.WorkTimer;
let currentBlock;

//				| bitmasks for each numeral's required segments
//    A   | 1's & capitals indicates a lit segment:
//	 F B  |	0x7e = 1111110 = ABCDEFg | 0x33 = 0110011 = aBCdeFG
//    G   |													 |
//	 E C  |						|‾|						 |			 | |
//		D		|						| |						 |				‾|
//				|	 					 ‾					 	 |
const litSegmentMask = [0x7e, 0x30, 0x6d, 0x79, 0x33, 0x5b, 0x5f, 0x70, 0x7f, 0x7b];

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

let pg;
let cW,cH

//TODO: properly integrate updateCanvas()

function setup() {
	cnv = createCanvas(800,300).style("display", "block");
	(function drawButtons() {
		let inputTime = 0;
		let buttonA = createButton("Clear").id("clearButton");
		buttonA.position(330, 175);
		buttonA.mousePressed(() => {
			clearTimer();
		});

		let buttonB = createButton("Pause");
		buttonB.id("pauseButton");
		buttonB.position(330, 198);
		buttonB.mousePressed(() => {
			pauseResume();
		});

		let buttonC = createButton("Restart");
		buttonC.position(330, 221);
		buttonC.mousePressed(() => {
			restartTimer();
		});

		let buttonD = createButton("Start");
		buttonD.position(410, 175);
		buttonD.mousePressed(() => {
			if (status == Status.NotStarted || status == Status.Expired)
				createTimer();
			if (status == Status.Paused) {
				select("#pauseButton").html("Pause");
				startTimer();
			}
		});

		let buttonE = createButton("Skip Current");
		buttonE.position(410, 198);
		buttonE.mousePressed(() => {
			if (currentBlock && timerBlocks.length) {
				createTimer();
			}
			//TODO: remove status check when color bug in expired() is fixed for real
			else if (
				!timerBlocks.length &&
				status != Status.Expired &&
				status != Status.NotStarted
			) {
				expired();
			}
		});

		let buttonF = createButton("Queue 🍅");
		buttonF.position(410, 221);
		buttonF.mousePressed(() => {
			Pomodoro();
		});

		let button1 = createButton("4 hours");
		button1.position(10, 175);
		button1.mousePressed(() => {
			inputTime = 4 * 60 * 60;
			createTimer(inputTime);
		});
		let button2 = createButton("3 hours");
		button2.position(10, 198);
		button2.mousePressed(() => {
			inputTime = 3 * 60 * 60;
			createTimer(inputTime);
		});
		let button3 = createButton("2 hours");
		button3.position(10, 221);
		button3.mousePressed(() => {
			inputTime = 2 * 60 * 60;
			createTimer(inputTime);
		});
		let button4 = createButton("1 hours");
		button4.position(10, 244);
		button4.mousePressed(() => {
			inputTime = 1 * 60 * 60;
			createTimer(inputTime);
		});

		let button5 = createButton("45 min");
		button5.position(90, 175);
		button5.mousePressed(() => {
			inputTime = 45 * 60;
			createTimer(inputTime);
		});
		let button6 = createButton("30 min");
		button6.position(90, 198);
		button6.mousePressed(() => {
			inputTime = 30 * 60;
			createTimer(inputTime);
		});
		let button7 = createButton("15 min");
		button7.position(90, 221);
		button7.mousePressed(() => {
			inputTime = 15 * 60;
			createTimer(inputTime);
		});

		let button8 = createButton("10 min");
		button8.position(170, 175);
		button8.mousePressed(() => {
			inputTime = 10 * 60;
			createTimer(inputTime);
		});
		let button9 = createButton("&nbsp;&nbsp;5 min");
		button9.position(170, 198);
		button9.mousePressed(() => {
			inputTime = 5 * 60;
			createTimer(inputTime);
		});
		let button10 = createButton("&nbsp;&nbsp;1 min");
		button10.position(170, 221);
		button10.mousePressed(() => {
			inputTime = 60;
			createTimer(inputTime);
		});

		let button11 = createButton("45 sec");
		button11.position(250, 175);
		button11.mousePressed(() => {
			inputTime = 45;
			createTimer(inputTime);
		});
		let button12 = createButton("30 sec");
		button12.position(250, 198);
		button12.mousePressed(() => {
			inputTime = 30;
			createTimer(inputTime);
		});
		let button13 = createButton("15 sec");
		button13.position(250, 221);
		button13.mousePressed(() => {
			inputTime = 15;
			createTimer(inputTime);
		});
	})();
	cW = cnv.width
	cH = cnv.height
	frameRate(30);

	pg = createGraphics(1200,450)
	pg.angleMode(DEGREES)
	updateCanvas()
	//createTimer()

} //setup

function draw() {
	image(pg,0,0,cW,cH)
}//draw

function updateCanvas(){
	pg.background(50);
	pg.textSize(30);
	pg.fill(255);
	pg.noStroke();

	const statusTextLocation = numSegments * boxWidth + 10
	let statusTextLineNumber = 1

	pg.text(status, statusTextLocation, pg.textSize()*(statusTextLineNumber++));
	pg.text(`Total time worked: ${timeWorked}`, statusTextLocation, pg.textSize()*(statusTextLineNumber++));

	let cbText = currentBlock ? `${currentBlock.blockType} for ${currentBlock.blockDuration}` : ``;
	pg.text( `Current block: ${cbText}`, statusTextLocation, pg.textSize()*(statusTextLineNumber++));

	let totalQueued = timerBlocks.reduce((a,c) => a + c.blockDuration,0)
	pg.text(`${timerBlocks.length} queued blocks, ${totalQueued} total time`, statusTextLocation, pg.textSize()*(statusTextLineNumber++));
	
	for (let i = 0; i < timerBlocks.length; i++) {
		pg.fill(TimerColors[timerBlocks[i].blockType]);
		pg.text(timerBlocks[i].blockDuration, statusTextLocation, pg.textSize()*(statusTextLineNumber++));
	}

	let digits = remainingTime.toString().padStart(numSegments, "0");
	pg.fill(30);
	//R-to-L

	for (let i = numSegments - 1; i >= 0; i--) {
		pg.push();
		pg.translate(i * boxWidth, 0);
		drawSevenSegment(digits[i]);
		pg.pop();

	}
}


const test = 1
function drawSegment(segment, lit) {
	const altVert = segmentData.vertices;
	const transform = segmentData.transforms[segment];
	lit == 1 ? pg.fill(onColor) : pg.fill(TimerColors.Off);
	pg.translate(transform.x, transform.y);

	pg.beginShape();
	for (const v of altVert) {
		pg.vertex(v.x, v.y);
	}
	pg.endShape(CLOSE);

	if(lit && test){
		pg.push()
		pg.blendMode(DODGE)
		pg.drawingContext.filter="blur(10px)"
		pg.beginShape();
		for (const v of altVert) {
			pg.vertex(v.x, v.y);
		}
		pg.endShape(CLOSE);
		pg.drawingContext.filter="none"
		pg.pop();
	}

} //drawSegment()

function drawSevenSegment(numeralToDraw) {
	pg.rect(0, 0, boxWidth, boxHeight);
	//blendMode is affected by push/pop
	//despite documentation not mentioning it
	//blendMode(DODGE);
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

function createTimer(time, interval) {
	if (timer) clearInterval(timer);
	if (expiredTimer) clearInterval(expiredTimer);

	const pB = select("#pauseButton")
	if(pB) pB.html("Pause");

	if (!time) {
		//time can be an int or a TimerBlock
		//shift() on empty array returns undefined, will default to new TimerBlock(defaultArg) 
		time = timerBlocks.shift();
	}
	if (!(time instanceof TimerBlock)) time = new TimerBlock(time);

	currentBlock = time
	onColor = TimerColors[currentBlock.blockType];
	remainingTime = currentBlock.blockDuration;
	updateCanvas()
	startTimer(interval);
} //createTimer()

function startTimer(interval) {
	if (!interval || typeof interval != "number") interval = 1000;
	status = Status.Running;
	//updateCanvas()
	timer = setInterval(() => {
		remainingTime--;

		if (currentBlock.blockType == TimerTypes.WorkTimer) {
			timeWorked++;
		}

		if (remainingTime == 0) {
			if (timerBlocks.length) {
				createTimer(timerBlocks.shift());
			} else {
				expired();
			}
		}
	updateCanvas()
	}, interval);
	updateCanvas()
}//startTimer()

function expired() {
	if(status != Status.Expired){
		status = Status.Expired;
		clearInterval(timer);
		clearInterval(expiredTimer);
		remainingTime = 0;
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
			updateCanvas()
		}, 420);
		updateCanvas()
	}
}//expired()

function clearTimer() {
	status = Status.NotStarted;
	remainingTime = 0;
	currentBlock = null;
	select("#pauseButton").html("Pause");
	if (timer) clearInterval(timer);
	if (expiredTimer) clearInterval(expiredTimer);
	onColor = TimerColors.Work;
	updateCanvas()
}//clearTimer()

function pauseResume() {
	switch (status) {
		//Pause should "technically" restore to the position in the interval
		//where it was triggered, but since this is for large timespans and not small ones,
		//it's a very small concern. Milliseconds across hours aren't a priority
		case Status.Running:
			status = Status.Paused;
			select("#pauseButton").html("Resume");
			clearInterval(timer);
			break;

		case Status.Paused:
			select("#pauseButton").html("Pause");
			startTimer();
			break;
	}
	updateCanvas()
}//pauseResume()

function restartTimer() {
	select("#pauseButton").html("Pause");
	if (currentBlock) {
		status = Status.Running;
		if (timer) clearInterval(timer);
		if (expiredTimer) clearInterval(expiredTimer);
		createTimer(currentBlock);
	}
	updateCanvas()
}//restartTimer()

function keyPressed() {
	let inputTime = 0;
	if (keyCode >= 49 && keyCode <= 57) {
		inputTime = keyCode - 48;
		createTimer(inputTime);
	}
	/*if (keyCode == 32) {
		//(inclusive,exclusive)
		inputTime = floor(random(1000, 100000));
		createTimer(inputTime);
		return false;
	}*/
}//keyPressed()

function Pomodoro() {
	timerBlocks.push(new TimerBlock(5 * 5 * 60, "Work"));
	timerBlocks.push(new TimerBlock(1 * 5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(5 * 5 * 60, "Work"));
	timerBlocks.push(new TimerBlock(1 * 5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(5 * 5 * 60, "Work"));
	timerBlocks.push(new TimerBlock(1 * 5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(5 * 5 * 60, "Work"));
	timerBlocks.push(new TimerBlock(1 * 5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(6 * 5 * 60, "Break"));
	updateCanvas()
}