"use strict";
let cnv;
let boxWidth = 150;
let boxHeight = 250;
let segmentShortDim = 12;
let segmentLongDim = 80;
let margin = { top: 27, right: 10, bottom: 27, left: 10 };
let gap = 2;
let triHeight = segmentShortDim / 2;

let inputTime = 0;
let remainingTime = inputTime;

let numSegments = 5;
let timeWorked = 0;

function TimerBlock(blockDuration = 3600, blockType = TimerTypes.WorkTimer) {
	this.blockDuration = blockDuration;
	this.blockType = blockType;
}

let timerBlocks = [];
let currentBlock;

function Pomodoro() {
	timerBlocks.push(new TimerBlock(25 * 60, "Work"));
	timerBlocks.push(new TimerBlock(5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(25 * 60, "Work"));
	timerBlocks.push(new TimerBlock(5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(25 * 60, "Work"));
	timerBlocks.push(new TimerBlock(5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(25 * 60, "Work"));
	timerBlocks.push(new TimerBlock(5 * 60, "Break"));

	timerBlocks.push(new TimerBlock(30 * 60, "Break"));
}

class Status {
	static NotStarted = "NotStarted";
	static Running = "Running";
	static Paused = "Paused";
	static Expired = "Expired";
}

class TimerColors {
	static Work = "#ffef33";
	static Expired = "#FF5500";
	static Break = "#58ff33";
	static Off = "#454545";
}

class TimerTypes {
	static WorkTimer = "Work";
	static BreakTimer = "Break";
}

let onColor = TimerColors.Work;

let status = Status.NotStarted;
let currentTimerType = TimerTypes.WorkTimer;

let timer;
let expiredTimer;

let digitCodes = [0x7e, 0x30, 0x6d, 0x79, 0x33, 0x5b, 0x5f, 0x70, 0x7f, 0x7b];

function setup() {
	cnv = createCanvas(windowWidth, windowHeight).style("display", "block");

	(function drawButtons() {
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
			//TODO: remove status check when color bug in expired() is fixed
			if (
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
		let button9 = createButton("5 min");
		button9.position(170, 198);
		button9.mousePressed(() => {
			inputTime = 5 * 60;
			createTimer(inputTime);
		});
		let button10 = createButton("1 min");
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
} //setup

function createTimer(time, interval) {
	if (timer) clearInterval(timer);
	if (expiredTimer) clearInterval(expiredTimer);

	if (!time) {
		time = timerBlocks.shift();
	}
	if (!(time instanceof TimerBlock)) time = new TimerBlock(time);

	//select("#pauseButton").html("Pause");

	currentTimerType = time.blockType;
	onColor = TimerColors[currentTimerType];

	currentBlock = time;
	inputTime = time.blockDuration;
	remainingTime = inputTime;

	startTimer(interval);
} //createTimer()

function startTimer(interval) {
	if (!interval || typeof interval != "number") interval = 1000;
	status = Status.Running;
	timer = setInterval(() => {
		remainingTime--;

		if (currentTimerType == TimerTypes.WorkTimer) {
			timeWorked++;
		}

		if (remainingTime == 0) {
			if (timerBlocks.length) {
				createTimer(timerBlocks.shift());
			} else {
				expired();
			}
		}
	}, interval);
}

function expired() {
	status = Status.Expired;
	clearInterval(timer);
	clearInterval(expiredTimer);
	remainingTime = 0;
	//TODO: currently buggy if expired() is called multiple times
	//color can get stuck on TimerColors.Expired
	let toggleBackToColor = onColor;
	onColor = TimerColors.Expired;
	expiredTimer = setInterval(() => {
		onColor == toggleBackToColor
			? (onColor = TimerColors.Expired)
			: (onColor = toggleBackToColor);
	}, 420);
}

function clearTimer() {
	status = Status.NotStarted;
	remainingTime = 0;
	currentBlock = null;
	select("#pauseButton").html("Pause");
	if (timer) clearInterval(timer);
	if (expiredTimer) clearInterval(expiredTimer);
	onColor = TimerColors.Work;
}

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
}

function restartTimer() {
	select("#pauseButton").html("Pause");
	if (currentBlock) {
		status = Status.Running;
		if (timer) clearInterval(timer);
		if (expiredTimer) clearInterval(expiredTimer);
		createTimer(currentBlock);
	}
}

function keyPressed() {
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
}

function draw() {
	frameRate(30);
	scale(0.68);
	noSmooth();
	background(50);
	textSize(30);
	fill(255);
	text(status, numSegments * boxWidth + 10, 30);
	let cbText = currentBlock
		? currentBlock.blockType + " for " + currentBlock.blockDuration
		: "";
	text(
		"Current block: " + cbText,
		numSegments * boxWidth + 10,
		30 + textSize(),
	);

	let total = 0;
	for (let i = 0; i < timerBlocks.length; i++) {
		total += timerBlocks[i].blockDuration;
		fill(TimerColors[timerBlocks[i].blockType]);
		text(
			timerBlocks[i].blockDuration,
			numSegments * boxWidth + 10,
			textSize() * 5 + i * textSize(),
		);
	}
	fill(255);
	text(
		"Time worked: " + timeWorked,
		numSegments * boxWidth + 10,
		textSize() * 3,
	);
	text(
		timerBlocks.length + " Queued blocks: " + total + " total time",
		numSegments * boxWidth + 10,
		textSize() * 4,
	);
	noStroke();
	fill(30);

	let digits = remainingTime.toString().padStart(numSegments, "0");

	//R-to-L
	for (let i = numSegments - 1; i >= 0; i--) {
		push();
		translate(i * boxWidth, 0);
		drawSevenSegment(digits[i]);
		pop();
	}
}

function drawSevenSegment(num) {
	rect(0, 0, boxWidth, boxHeight);
	//blendMode is affected by push/pop
	//despite documentation not mentioning it
	blendMode(DODGE);
	segA((digitCodes[num] >> 6) & 1);
	segB((digitCodes[num] >> 5) & 1);
	segC((digitCodes[num] >> 4) & 1);
	segD((digitCodes[num] >> 3) & 1);
	segE((digitCodes[num] >> 2) & 1);
	segF((digitCodes[num] >> 1) & 1);
	segG((digitCodes[num] >> 0) & 1);
}

function blurSeg(fn) {
	fill(onColor);
	//THIS IS SLOOOOOWWWWWWW, tanks fps to like 8
	//seems like maybe an algo problem, since this is the "fast" way according to a quick search
	//so I wonder if I can speed it up
	/*drawingContext.filter="blur(2px) brightness(90%) saturate(90%)"
	fn();
	drawingContext.filter="none"*/
}

const segmentVertices = {
	//Clockwise from left (horizontal) or top (vertical) triangle point
	A: [
		{
			//-gap*2 on all Ys
			x: boxWidth / 2 - segmentLongDim / 2 - triHeight,
			y: margin.top + triHeight - gap * 2,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: margin.top - gap * 2,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: margin.top - gap * 2,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + triHeight,
			y: margin.top + triHeight - gap * 2,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: margin.top + segmentShortDim - gap * 2,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: margin.top + segmentShortDim - gap * 2,
		},
	],
	B: [
		{
			//-gap on all Ys
			x: boxWidth / 2 + segmentLongDim / 2 + triHeight,
			y: margin.top + triHeight - gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + segmentShortDim,
			y: margin.top + segmentShortDim - gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + segmentShortDim,
			y: boxHeight / 2 - triHeight - gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + triHeight,
			y: boxHeight / 2 - gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: boxHeight / 2 - triHeight - gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: margin.top + segmentShortDim - gap,
		},
	],
	C: [
		{
			//+gap on all Y's
			x: boxWidth / 2 + segmentLongDim / 2 + triHeight,
			y: boxHeight / 2 + gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + segmentShortDim,
			y: boxHeight / 2 + triHeight + gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + segmentShortDim,
			y: boxHeight / 2 + segmentLongDim + triHeight + gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + triHeight,
			y: boxHeight / 2 + segmentLongDim + segmentShortDim + gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: boxHeight / 2 + segmentLongDim + triHeight + gap,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: boxHeight / 2 + triHeight + gap,
		},
	],
	D: [
		{
			//+gap*2 on all Y's
			x: boxWidth / 2 - segmentLongDim / 2 - triHeight,
			y: boxHeight - margin.bottom - triHeight + gap * 2,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: boxHeight - margin.bottom - segmentShortDim + gap * 2,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: boxHeight - margin.bottom - segmentShortDim + gap * 2,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + triHeight,
			y: boxHeight - margin.bottom - triHeight + gap * 2,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: boxHeight - margin.bottom + gap * 2,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: boxHeight - margin.bottom + gap * 2,
		},
	],
	E: [
		{
			//+gap on all Y's
			x: boxWidth / 2 - segmentLongDim / 2 - triHeight,
			y: boxHeight / 2 + gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: boxHeight / 2 + triHeight + gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: boxHeight / 2 + segmentLongDim + triHeight + gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2 - triHeight,
			y: boxHeight / 2 + segmentLongDim + segmentShortDim + gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2 - segmentShortDim,
			y: boxHeight / 2 + segmentLongDim + triHeight + gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2 - segmentShortDim,
			y: boxHeight / 2 + triHeight + gap,
		},
	],
	F: [
		{
			//-gap on all Y's
			x: boxWidth / 2 - segmentLongDim / 2 - triHeight,
			y: margin.top + triHeight - gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: margin.top + segmentShortDim - gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: boxHeight / 2 - triHeight - gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2 - triHeight,
			y: boxHeight / 2 - gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2 - segmentShortDim,
			y: boxHeight / 2 - triHeight - gap,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2 - segmentShortDim,
			y: margin.top + segmentShortDim - gap,
		},
	],
	G: [
		{
			x: boxWidth / 2 - segmentLongDim / 2 - triHeight,
			y: boxHeight / 2,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: boxHeight / 2 - triHeight,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: boxHeight / 2 - triHeight,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2 + triHeight,
			y: boxHeight / 2,
		},
		{
			x: boxWidth / 2 + segmentLongDim / 2,
			y: boxHeight / 2 + triHeight,
		},
		{
			x: boxWidth / 2 - segmentLongDim / 2,
			y: boxHeight / 2 + triHeight,
		},
	],
};

function drawSegmentShape(segment) {
	const vertices = segmentVertices[segment];

	beginShape();

	for (let i = 0; i < vertices.length; i++) {
		vertex(vertices[i].x, vertices[i].y);
	}

	endShape(CLOSE);
}

//top
function segA(lit) {
	if (arguments.length == 1) {
		lit == 1 ? blurSeg(segA) : fill(TimerColors.Off);
	}

	drawSegmentShape("A");
}
//topLeft
function segF(lit) {
	if (arguments.length == 1) {
		lit == 1 ? blurSeg(segF) : fill(TimerColors.Off);
	}

	drawSegmentShape("F");
}
//topRight
function segB(lit) {
	if (arguments.length == 1) {
		lit == 1 ? blurSeg(segB) : fill(TimerColors.Off);
	}

	drawSegmentShape("B");
}
//middle
function segG(lit) {
	if (arguments.length == 1) {
		lit == 1 ? blurSeg(segG) : fill(TimerColors.Off);
	}

	drawSegmentShape("G");
}
//bottomLeft
function segE(lit) {
	if (arguments.length == 1) {
		lit == 1 ? blurSeg(segE) : fill(TimerColors.Off);
	}

	drawSegmentShape("E");
}
//bottomRight
function segC(lit) {
	if (arguments.length == 1) {
		lit == 1 ? blurSeg(segC) : fill(TimerColors.Off);
	}

	drawSegmentShape("C");
}
//bottom
function segD(lit) {
	if (arguments.length == 1) {
		lit == 1 ? blurSeg(segD) : fill(TimerColors.Off);
	}

	drawSegmentShape("D");
}