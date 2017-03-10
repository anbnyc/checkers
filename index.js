const tiles = 8, size = 600, dim = size/tiles;
let board, canvas, context;
let turn = 0;
let turnCount = 0;

let isShiftDown = false;
let clickqueue = [];

let weirdSpeed = 10;
let weirdSpeedFactor = .95;
let weirdStart = Math.floor(10*Math.random()) + 4;
let weirdIncrement = 2;
initial();

/**** SETUP FUNCTIONS ****/
function initial(){
	canvas = document.querySelector("canvas");
	context = canvas.getContext("2d");
	prepBoard(()=>{
		drawBoard();
		drawPieces();
		canvas.addEventListener('click',clickRouter);
		window.addEventListener('keydown',keypressRouter);
		window.addEventListener('keyup',keypressRouter);
	});
}

function prepBoard(callback){
	board = new Board(tiles,"images/orange.png","images/purple.svg");
	callback();
}

function Board(tiles,player0,player1){
	_.times(tiles,i=>{
		this[i] = {}
		_.times(tiles,j=>{
			this[i][j] = {
				y: i,
				x: j,
				isOccupied: false,
				isCrowned: false,
				side: null
			}
		});
	});
	this.move = {
		status: false,
		x: null,
		y: null
	}
	this.players = {};
	this.players[0] = new Player("orange",player0);
	this.players[1] = new Player("purple",player1);
}

function Player(color,path){
	this.avatar = new Image();
	this.name = color;
	this.avatar.src = path;
	this.color = color === "orange" ? [237,108,48] : [161,87,232];
	this.crownColor = color === "orange" ? [255,0,63] : [63,0,255];
	this.jailCount = 0;
}

function drawBoard(){
	_.times(tiles,i=>{
		_.times(tiles,j=>{
			board[i][j].color = (j % 2 === i % 2) ? "gray" : "black";
			drawBoardTile(i,j);
		});
	});
}

function drawPieces(){
	placePieces(0);
	placePieces(1);
}

function placePieces(side){
	const dim = size/tiles;
	_.times(3,i=>{
		_.times(tiles,j=>{
			if(side === 0){
				if(j % 2 !== i % 2){
					occupyBoardTile(i, j, side);
					drawPlayer(i, j, side);
				}
			} else if (side === 1){
				if(j % 2 === i % 2){
					occupyBoardTile(tiles-1-i, j, side);
					context.drawImage(board.players[side].avatar, j*dim, size-((i+1)*dim), dim, dim);
				}
			} else {
				console.warn("Side must be 0 or 1. Received "+side);
			}
		});
	});
}

function restoreBoard(){
	_.times(tiles,i=>{
		_.times(tiles,j=>{
			drawBoardTile(i, j);
			if(board[i][j].isOccupied){
				drawPlayer(i, j, board[i][j].side);
			}
		});
	});
}

function drawBoardTile(y, x){
	context.fillStyle = board[y][x].color;
	context.fillRect(x*dim, y*dim, dim, dim);
}

function unoccupyBoardTile(y, x){
	board[y][x].isOccupied = false;
	board[y][x].isCrowned = false;
	board[y][x].side = null;
}

function occupyBoardTile(y, x, side, crown=false){
	board[y][x].isOccupied = true;
	board[y][x].isCrowned = crown;
	board[y][x].side = side;
}

function drawPlayer(y, x, side, ypos = y*dim, xpos = x*dim, ydim = dim, xdim = dim){
	const player = board.players[side].avatar;
	context.drawImage(player, xpos, ypos, xdim, ydim);

	//recolor crowned players using crown colors
	if(board[y][x].isCrowned){
		let imageData = context.getImageData(xpos, ypos, xdim, ydim);
		let color = board.players[side].color;
		let crownColor = board.players[side].crownColor;
		for(var p = 0; p < imageData.data.length; p += 4){
			if(imageData.data[p] === color[0] && imageData.data[p+1] === color[1] && imageData.data[p+2] === color[2]){
				imageData.data[p] = crownColor[0];
				imageData.data[p+1] = crownColor[1];
				imageData.data[p+2] = crownColor[2];
			}
		}
		context.putImageData(imageData, xpos, ypos);
	}	
}

function resetMoveStatus(){
	board.move.status = false;
	board.move.x = null;
	board.move.y = null;
}

function adjustJailCount(side,increment=true){
	board.players[side].jailCount += increment ? 1 : -1;
	$('#side-'+side+" > h3").text(board.players[side].jailCount);
}

/**** PLAY FUNCTIONS ****/
function clickRouter(event){
	let x = event.clientX, y = event.clientY;
	const Y = Math.floor(y / dim);
	const X = Math.floor(x / dim);

	if(isShiftDown){
		clickqueue.push([Y,X]);
	} else {
		singleMove(Y,X);
	}
}

function keypressRouter(event){
	if (event.type === "keydown" && event.key === "Shift"){
		isShiftDown = true;
	} else if(event.type === "keyup" && event.key === "Shift"){
		isShiftDown = false;
		if(clickqueue.length === 1) {
			singleMove(clickqueue[0][0],clickqueue[0][1]);
		} else if(clickqueue.length > 1){
			multiMove(clickqueue);
		}
		clickqueue = [];
	}
}

function multiMove(yxArray){
	//pending move exists
	if(board.move.status){
		checkMultiMove(yxArray);

	//no pending move exists
	} else {
		let Y = yxArray[0][0];
		let X = yxArray[0][1];
		if(board[Y][X].side === turn && board[Y][X].isOccupied){
			readyToMove(Y, X);
		}
	}
}

function singleMove(Y, X){
	//pending move exists
	if(board.move.status){
		checkMove(Y,X);

	//no pending move exists
	} else {
		if(board[Y][X].side === turn && board[Y][X].isOccupied){
			readyToMove(Y, X);
		}
	}
}

function readyToMove(Y, X){
	const resize = .95;
	drawBoardTile(Y,X);
	drawPlayer(Y, X, board[Y][X].side);

	//draw yellow halo for selected player
	imageData = context.getImageData(X*dim, Y*dim, dim, dim);
	for(var p = 0; p < imageData.data.length; p += 4){
		if(imageData.data[p] !== 0 && imageData.data[p] !== 128){
			imageData.data[p] = 255;
			imageData.data[p+1] = 255;
			imageData.data[p+2] = 0;
		}
	}
	context.putImageData(imageData, X*dim, Y*dim);
	
	//redraw actual player
	drawPlayer(Y, X, board[Y][X].side, Y*dim+(.5*(1-resize)*dim), X*dim+(.5*(1-resize)*dim), resize*dim, resize*dim);

	//pending move status
	board.move.status = true;
	board.move.x = X;
	board.move.y = Y;
}

function notReadyToMove(){
	const y = board.move.y,
				x = board.move.x;
	drawBoardTile(y, x);
	drawPlayer(y, x, board[y][x].side);
	resetMoveStatus();
}

function checkMultiMove(yxArray){
	const isCrowned = board[board.move.y][board.move.x].isCrowned;
	let toY, toX, lastY, lastX, betweenY, betweenX, deltaY, deltaX;
	yxArray = [[board.move.y, board.move.x]].concat(yxArray);
	for(var i = 1; i < yxArray.length; i++){
		toY = yxArray[i][0];
		toX = yxArray[i][1];
		lastY = yxArray[i-1][0];
		lastX = yxArray[i-1][1];
		deltaY = toY - lastY;
		deltaX = toX - lastX;
		betweenY = (toY + lastY)/2;
		betweenX = (toX + lastX)/2;
		if(board[toY][toX].isOccupied){
			notReadyToMove();
			return;
		} else if (Math.abs(deltaX) !== 2 ||
							 !((turn === 0 && deltaY === 2) ||
							 (turn === 1 && deltaY === -2) ||
							 (isCrowned && Math.abs(deltaY) === 2)) ||
							 !(board[betweenY][betweenX].isOccupied) ||
							 board[betweenY][betweenX].side === turn){
			notReadyToMove();
			return;
		}
	}

	//replicates the logic of moveAndTake
	for(var i = 1; i < yxArray.length; i++){
		toY = yxArray[i][0];
		toX = yxArray[i][1];
		lastY = yxArray[i-1][0];
		lastX = yxArray[i-1][1];
		betweenY = (toY + lastY)/2;
		betweenX = (toX + lastX)/2;
		adjustJailCount(board[betweenY][betweenX].side);
		drawBoardTile(betweenY, betweenX);
		unoccupyBoardTile(betweenY, betweenX);
		if(i === yxArray.length - 1){
			move(toY,toX);
		}
	}
}

function checkMove(toY, toX){

	const isCrowned = board[board.move.y][board.move.x].isCrowned;

	const betweenY = (toY + board.move.y)/2;
	const betweenX = (toX + board.move.x)/2;
	const deltaY = toY - board.move.y;
	const deltaX = toX - board.move.x;

	//cannot move to occupied tile
	if(board[toY][toX].isOccupied){
		notReadyToMove();
		return;
	}

	//valid take
	//must move down/up (player 0/1) two spaces
	//can move left or right two spaces
	//must have opponent in between
	if (Math.abs(deltaX) === 2 &&
		((turn === 0 && deltaY === 2) ||
		 (turn === 1 && deltaY === -2) ||
		 (isCrowned && Math.abs(deltaY) === 2)) &&
		board[betweenY][betweenX].isOccupied &&
		board[betweenY][betweenX].side !== turn) {
			moveAndTake(toY, toX, betweenY, betweenX);

	//check if it's a valid move
	//must move down/up (player 0/1) one space
	//can move left or right one space
	} else if (Math.abs(deltaX) === 1 &&
						((turn === 0 && deltaY === 1) ||
						 (turn === 1 && deltaY === -1) ||
						 (isCrowned && Math.abs(deltaY) === 1))) {
		move(toY, toX);

	} else {
		notReadyToMove();
	}
}

function moveAndTake(toY, toX, removeY, removeX){
	//taken loses piece
	adjustJailCount(board[removeY][removeX].side);
	drawBoardTile(removeY, removeX);
	unoccupyBoardTile(removeY, removeX);

	move(toY,toX);
}

function move(toY,toX){
	//check if player isCrowned BEFORE unoccupying tile
	let crown = ((turn === 0 && toY === (tiles - 1)) ||
		 					 (turn === 1 && toY === 0) ||
		 					 (board[board.move.y][board.move.x].isCrowned));

	//origin tile loses player
	drawBoardTile(board.move.y, board.move.x);
	unoccupyBoardTile(board.move.y, board.move.x);

	//destination tile gets player
	occupyBoardTile(toY, toX, turn, crown);
	drawPlayer(toY, toX, turn);

	//clear pending move status
	resetMoveStatus();

	//check if game is won
	if(board.players[0].jailCount === 12){
		winEvent(1);
	} else if (board.players[1].jailCount === 12){
		winEvent(0);

	//otherwise proceed to the next turn
	} else {
		turn = (turn + 1) % 2;
		turnCount += 1;
		$('#turn').text("Turn: "+board.players[turn].name);
		console.log((weirdStart - turnCount) + "...");
		if(turnCount === weirdStart){
			weirdStuff();
		}
	}
}

function winEvent(side){
	$('#turn').text("WINNER: "+board.players[side].name);
	canvas.removeEventListener('click',clickRouter);
	canvas.removeEventListener('keydown',keypressRouter);
	canvas.removeEventListener('keyup',keypressRouter);
}

/**** SUPERNATURAL HAPPENINGS ****/

function weirdStuff(){
	let activity = Math.random();

	//only jailbreak if there's anyone in jail
	if(activity > .5 && board.players[0].jailCount + board.players[1].jailCount > 0){
		weirdStart += Math.floor(10*Math.random()) + weirdIncrement;
		weirdSpeed *= weirdSpeedFactor;
		initJailbreak();

	//only kidnap if the game isn't about to end
	} else if (board.players[0].jailCount < 11 && board.players[1].jailCount < 11) {
		weirdStart += Math.floor(10*Math.random()) + weirdIncrement;
		weirdSpeed *= weirdSpeedFactor;
		initKidnap();

	//else redo
	} else {
		weirdStuff();
	}
}

function initKidnap(){
	let X = Math.floor(tiles*Math.random()),
			Y = Math.floor(tiles*Math.random());
	if(board[Y][X].isOccupied){
		let side = board[Y][X].side;
		let coords = [
			Y*dim, X*dim,				//start
			.5*(size - dim), 0,	//end
			Y, X								//tile
		];
		function animateDone(){
			adjustJailCount(side);
		}
		kidnapJailbreak(coords, side, animateDone, true);
	} else {
		initKidnap();
	}
}

function initJailbreak(){
	let X = Math.floor(tiles*Math.random()),
			Y = Math.floor((tiles - 2)*Math.random()) + 1, // can't place in first or last row
			side = Math.floor(2 * Math.random());
	if((X % 2 !== Y % 2) && !board[Y][X].isOccupied && board.players[side].jailCount > 0){
		let coords = [
			.5*(size - dim), 0, //start
			Y*dim, X*dim,				//end
			Y, X								//tile
		]
		function animateDone(){
			occupyBoardTile(Y, X, side);
			restoreBoard();
		}
		kidnapJailbreak(coords, side, animateDone, false);
	} else {
		initJailbreak();
	}
}

function kidnapJailbreak(coords, side, animateDone, kidnap=true){
	console.log(kidnap ? "KIDNAPPING!" : "JAILBREAK!");
	const coeff = kidnap ? -1 : 1;
	let [ startY, startX, endY, endX, tileY, tileX ] = coords;
	let stepX = weirdSpeed*(tileX+1),
			stepY = stepX*(startY - endY)/(startX - endX),
			player = board.players[side].avatar;

	if(kidnap){ 
		unoccupyBoardTile(tileY, tileX); 
	} else {
		adjustJailCount(side,false);
	}
	window.requestAnimationFrame(animate);

	function animate(){
		startY += coeff*stepY;
		startX += coeff*stepX;
		restoreBoard();
		drawPlayer(tileY, tileX, side, startY, startX);
		tentacle(startY, startX - 718, (kidnap ? (side + 1) % 2 : side));
		if((kidnap && startX + dim > endX) || (!kidnap && startX <= endX)){
			window.requestAnimationFrame(animate);
		} else {
			animateDone();
		}
	}
}

function tentacle(y, x, side){
	context.beginPath();
	context.moveTo(x, y);
	for(var i = 0; i < 145; i++){
		context.lineTo(x + 5*i, y + 20 + 10*Math.sin(i*Math.PI/12));    
	}
	for(var i = 145; i > 0; i--){
		context.lineTo(x + 5*i, y + 180 - i - 10*Math.cos(i*Math.PI/12));
	}
	context.closePath();
	context.fillStyle = "rgb("+board.players[side].color.join(",")+")";
	context.fill();
}