/*
	VistA Viewer for EWD 3
	Author: Nikolay Topalov

	Copyright 2014 - 2016 Nikolay Topalov

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	
	http://www.apache.org/licenses/LICENSE-2.0
	
	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/
var vista = require('./nstNodeVistA');

// returns M routine code
var getPatchRoutineList = function(pPatchIEN, ewd) {
		
		// use M function to get the routine list
		var param = {"input": {"patchIEN" : pPatchIEN}};
		var tempGlobal = new ewd.documentStore.DocumentNode('TMP',['ewd',process.pid,'RPC']);
		tempGlobal.delete();
		tempGlobal.setDocument(param);
	
		var tmp = getNA(tempGlobal._node);  // e.g., ^TMP("ewd","3740","RPC")
		var res = ewd.db.function({function:'getPatchRoutineList^nstNodeUtils',arguments:[tmp]});
		var result = tempGlobal.$('result').getDocument();
		tempGlobal.delete();	
		return result;
	};
	
// returns a global node as a string 	
var getNA = function(globalNode) {  //,'^' + ewd.temp.globalName + '("' + ewd.temp.subscripts.join('","') + '","RPC")'; 
    var globalName = "^" + globalNode.global + "("; 
	
	if (globalNode.subscripts.length > 0) {
		globalName +=  '"' + globalNode.subscripts.join('","') + '"';
	}
	
	if (arguments.length > 1) {
		var args = [];
		for (var i = 1; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		if (globalNode.subscripts.length > 0) {
			globalName += ',';
		}
		globalName += '"' + args.join('","') + '"';
	};
	
	globalName += ')';
	
	return globalName;  
};	
	// simple $piece 
var piece = function(str,delimiter,position) {
		
		if (str === undefined) return "";
		
		var buf = str.split(delimiter);
		
		return (buf[position-1] === undefined) ? "" : buf[position-1]; 
		
	};

 	// returns word-processing field value
	// root is the global node of the field e.g., ^XWB(8994,D0,1)
var wordProcessingGlobal = function(root) {

		var result = "";
		var line;
		var x = root.getDocument();
		for (line in x) {
			if (line > 0) result += x[line] + '\n';
		}
				
		return result;	
	}; 
	
	// returns word-processing field value
	// root is the array with the WP field value
var wordProcessingArray = function(root) {

		var result = "";
		var line;
		for (line in root) {
			if (line > 0) result += root[line] + '\n';
		}
				
		return result;	
	};

	// returns a list by patch IEN (pPatchIEN) and Kernel component (pFile)
var getKernelList = function(pPatchIEN, pFile, ewd) { 

	var result = [];
	var root = new ewd.documentStore.DocumentNode('XPD', [9.6, pPatchIEN,"KRN",pFile,"NM","B"]);
	
	var rootComponentGlobal = vista.di.fileRoot(pFile,ewd);
	rootComponentGlobal = piece(rootComponentGlobal,'(',1)
	rootComponentGlobal.substring(2,rootComponentGlobal.length-1);
	
	var indices =  (pFile === '.4' || pFile === '.401' || pFile === '.402') ? ["B"] : [pFile,"B"];
	var rootComponent = new ewd.documentStore.DocumentNode(rootComponentGlobal, indices);
	
	root.forEachChild({},function(name,node) { 
				
		if (pFile === '.4' || pFile === '.401' || pFile === '.402') {
				name = piece(name,'    FILE #',1);
		};
		
		ien = rootComponent.$(name).firstChild.name;
		result.push( {'ien': ien, 'name': name});							
		 
	});
	
	return result;
};

	// returns VistA RPC definition
var getRPCDetails = function(pIEN, ewd) {

	var file = 8994;	// REMOTE PROCEDURE file (#8994)
	
	var rpcRaw = vista.di.recordByIEN(file, pIEN, "**", "ER",ewd);
	
	var iens = pIEN + ',';
	
	var attr = rpcRaw.result[file][iens];
	
	var rpc = { };
	rpc.ien = pIEN;
	rpc.name = attr['NAME']['E'];
	rpc.tag = attr['TAG']['E'];
	rpc.routine = attr['ROUTINE']['E'];
	rpc.returnValueType = attr['RETURN VALUE TYPE']['E'];
	rpc.availability = attr['AVAILABILITY']['E'];
	rpc.inactive = attr['INACTIVE']['E'];
	rpc.clientManager = attr['CLIENT MANAGER']['E'];
	rpc.wordWrapOn = attr['WORD WRAP ON']['E'];
	rpc.version = attr['VERSION']['E'];

	rpc.description = wordProcessingArray(attr['DESCRIPTION']);
	rpc.returnValueDescription = wordProcessingArray(attr['RETURN PARAMETER DESCRIPTION']);
	
	rpc.inputParameters = [];
	
	var inputParameters = rpcRaw.result['8994.02'];
	var inputParameter;
	for (var i in inputParameters) {
		inputParameter = {};
		inputParameter.name = inputParameters[i]['INPUT PARAMETER']['E'];		
		inputParameter.type = inputParameters[i]['PARAMETER TYPE']['E'];	
		inputParameter.maximumLength = inputParameters[i]['MAXIMUM DATA LENGTH']['E'];
		inputParameter.required = inputParameters[i]['REQUIRED']['E'];
		inputParameter.sequence = inputParameters[i]['SEQUENCE NUMBER']['E'];
		inputParameter.description = wordProcessingArray(inputParameters[i]['DESCRIPTION']);
		rpc.inputParameters.push(inputParameter);
	};

	return rpc;
};
		
	
module.exports = {
	
	handlers: {
	
		'processSelection' : function(messageObj, session, send, finished) {
			var pNameStart = messageObj.params.nameStart;
			var pNameContain = messageObj.params.nameContain;
			var pComponent = messageObj.params.component;
			
			var componentFileNumber;
			
			if (pComponent === 'securityKey' ) {
				var componentFileNumber = 19.1;
				var componentFileName = 'SECURITY KEY';
			} else if (pComponent === 'parameterDefinition') {
				var componentFileNumber = 8989.51;
				var componentFileName = 'PARAMETER DEFINITION';		
			} else if (pComponent === 'option') {
				var componentFileNumber = 19;
				var componentFileName = 'OPTION';	
			} else if (pComponent === 'routine') {
				var componentFileNumber = 9.8;
				var componentFileName = 'ROUTINE';	
			} else {
				return;
			};				
			
			var componentGlobal = vista.di.fileRoot(componentFileNumber, this);
						
			componentGlobal = piece(componentGlobal,'(',1)
			componentGlobal.substring(2,componentGlobal.length-1);
	
			var indices =  (componentFileNumber === '.4' || componentFileNumber === '.401' || componentFileNumber === '.402') ? ["B"] : [componentFileNumber,"B"];
			
			var results = [] ;
			var documentIndex = new this.documentStore.DocumentNode(componentGlobal, indices);		
					
			var itemIEN;
			
			if ( (pNameStart.length > 0) || (pNameContain.length > 0) ) { 
				
				documentIndex.forEachChild({prefix: pNameStart}, function(itemName, node) {
						
					if ((pNameContain.length > 0) && (itemName.indexOf(pNameContain) == -1 )) {
								return
					};

					itemIEN = node.firstChild.name;
					results.push( {ien: itemIEN, name: itemName});	
					
					return;		
										
				});
			};
	
			finished({
					'component' : { 'file' : componentFileNumber, 'name' : componentFileName },
					'items' : results
					});
			finished({});		
			return;
	
		},
		
		'processDDSelection': function(messageObj, session, send, finished) {
			// Set parameters
			var pFileFrom = Number(messageObj.params.fileFrom);
			var pFileTo = Number(messageObj.params.fileTo);
			var pNameStart = messageObj.params.nameStart;
			var pNameContain = messageObj.params.nameContain;
			var pGlobal = messageObj.params.global;
			
			// Set the file input range if need it
			pFileFrom = pFileFrom === 0 ? pFileTo : pFileFrom;
			pFileTo = pFileTo === 0 ? pFileFrom : pFileTo;
							
			var results = [] ;
			var ok;      // flag for a hit
			var dic = new this.documentStore.DocumentNode('DIC', []);			
			
			var fileNumber;
			if (pFileFrom === 0) {
				fileNumber = 0;
			} else {
				var dictemp = new this.documentStore.DocumentNode('DIC', [pFileFrom]);				
				fileNumber = dictemp.previousSibling.name;				
			};				
			
			do {
				
				fileNumber = this.documentStore.db.next({global: dic.documentName, subscripts: [fileNumber]}).result;
				
				if (isNaN(fileNumber)) break;  // quit if it is not a number
				if ((pFileTo>0) && (fileNumber > pFileTo)) break;
				
				var pieces = dic.$(fileNumber).$('0').value.split('^');
				var global = dic.$(fileNumber).$('0').$('GL').value.split('^')[1];
				global = typeof global !== "undefined" ? global : '';
				var fileName = pieces[0];
									
				ok = fileNumber >= pFileFrom && fileNumber <= pFileTo;  // file number between
		
				if (!ok) {								
					if ((pNameStart.length > 0) && (fileName.slice(0, pNameStart.length) === pNameStart))
					{
						ok = true;	
					} else if ((pNameContain.length > 0) && (fileName.indexOf(pNameContain) != -1 )) {
						ok = true;
					} else if ((pGlobal.length > 0) && (global.slice(0, pGlobal.length) === pGlobal)) {
						ok = true;	
					}
				};
					
				if (ok) results.push( {file: fileNumber, name: fileName});	
			} while (true);	
			
			finished({results});			
			return;
		},
		
		'processRPCSelection': function(messageObj, session, send, finished) {
			// Set parameters
			var pIENFrom = Number(messageObj.params.ienFrom);
			var pIENTo = Number(messageObj.params.ienTo);
			var pNameStart = messageObj.params.nameStart;
			var pNameContain = messageObj.params.nameContain;
			var pRoutine = messageObj.params.routine;
			
			// Set the IEN input range if need it
			pIENFrom = pIENFrom === 0 ? pIENTo : pIENFrom;
			pIENTo = pIENTo === 0 ? pIENFrom : pIENTo;
							
			var results = [] ;
			var ok;      // flag for a hit
			var rpcs = new this.documentStore.DocumentNode('XWB', [8994]);			
			var ien;
			
			rpcs.forEachChild({range: {from :'.01', to: '9~'}},function(ien,node){ // get next node ^XWB(8994,ien)
											
				var pieces = node.$('0').value.split('^');				
				var rpcName = pieces[0];
									
				ok = ien >= pIENFrom && ien <= pIENTo;  // IEN between
		
				if (!ok) {

					var rpcRoutine = (typeof pieces[2] === 'undefined') ? "" : pieces[2];
									
					if ((pNameStart.length > 0) && (rpcName.slice(0, pNameStart.length) === pNameStart))
					{
						ok = true;	
					} else if ((pNameContain.length > 0) && (rpcName.indexOf(pNameContain) != -1 )) {
						ok = true;
					} else if ((pRoutine.length > 0) && (rpcRoutine.slice(0, pRoutine.length) === pRoutine)) {
						ok = true;	
					}
				};
					
				if (ok) results.push( {ien: ien, name: rpcName});	
			});	
						
			finished({
					'component' : { 'file' : 8994, 'name' : 'REMOTE PROCEDURE' },
					'rpcs' : results
					});	
			return;
		},
		
		'processPatchSelection': function(messageObj, session, send, finished) {

			// Set parameters
			var pNameStart = messageObj.params.nameStart;
			var pNameContain = messageObj.params.nameContain;
	
			var results = [] ;
			var documentIndex = new this.documentStore.DocumentNode("XPD", [9.6,"B"]);	// BUILD file (#9.6)		
			var itemIEN;
			
			if ( (pNameStart.length > 0) || (pNameContain.length > 0) ) { 
				
				documentIndex.forEachChild({prefix: pNameStart}, function(itemName, node) {
						
					if ((pNameContain.length > 0) && (itemName.indexOf(pNameContain) == -1 )) {
								return
					};
						
					itemIEN = node.firstChild.name;
					results.push( {ien: itemIEN, name: itemName});	
					
					return;		
										
				});
			};
			finished({results});
			return 		
		},
		
		'getPatchSummary' : function(messageObj, session, send, finished) {
			var pPatchName = messageObj.params.patchName;
			
			var patchIEN = vista.di.findExactMatchByName(9.6, pPatchName, this);
			
			if (patchIEN <= 0) {
				
				finished({});
				return; // TODO patch not found
			}
			
			var components = [];
		
			var root = new this.documentStore.DocumentNode('XPD', [9.6, patchIEN,"KRN"]);
			var counter;
			var fileName;
			var ewd = this;
			
			// Get counter of each Kernel component
			root.forEachChild({range:{from:"",to:" "}},function(componentFile,node) { 
				counter = vista.di.getRecordsCounter(node.$('NM'), ewd);	// number of components 
				
				fileName = vista.di.fileName(componentFile, ewd);  // TODO somethong is worng with this function 09/14/2016
				
				components.push( {'name': fileName, 'counter': counter, 'file': componentFile});
			});
			
			var raw = vista.di.recordByIEN(9.6, patchIEN, "*", "ER", this);		
			var iens = patchIEN + ',';
			var attr = raw.result[9.6][iens];
			
			var patch = {};
			patch.ien = patchIEN;
			patch.name = attr['NAME']['E'];
			patch.dateDistributed = attr['DATE DISTRIBUTED']['E'];

			patch.preInstallRoutine = attr['PRE-INSTALL ROUTINE']['E'];
			patch.postInstallRoutine = attr['POST-INSTALL ROUTINE']['E'];
			patch.environmentCheckRoutine = attr['ENVIRONMENT CHECK ROUTINE']['E'];
			
			patch.deletePreInstallRoutine = attr['DELETE ENV ROUTINE']['E'];
			patch.deletePostInstallRoutine = attr['DELETE POST-INIT ROUTINE']['E'];
			patch.deleteEnvironmentCheckRoutine = attr['DELETE PRE-INIT ROUTINE']['E'];
			
			patch.preTransportationRoutine = attr['PRE-TRANSPORTATION ROUTINE']['E'];
			
			patch.description = wordProcessingArray(attr['DESCRIPTION OF ENHANCEMENTS']);		
			
			// Get DD counter
			root = new this.documentStore.DocumentNode('XPD', [9.6, patchIEN,4]);	
			counter = vista.di.getRecordsCounter(root, this); // number of DDs 
			patch.dd = {
						'counter' : counter,
						'file' : 4,
						'name' : 'Data Dictionary'
						};
									
			// Get Required patches counter
			root = new this.documentStore.DocumentNode('XPD', [9.6, patchIEN,"REQB"]);	
			patch.requiredCounter = vista.di.getRecordsCounter(root, this); // number of required patches
			
			send({
					type: 'displayPatchSummary',
					params:	{	'components': components, 
								'patch': patch	}
				});
			finished({});	
			return ;
		},
				
		'getPatchComponentList' : function(messageObj, session, send, finished) {
			var pComponent = messageObj.params.component;				
			var pPatchIEN = messageObj.params.patchIEN;
			result = getKernelList(pPatchIEN, pComponent.file, this);
		
			send({
					type: 'displayPatchComponentList',
					params:	{	'component': pComponent,
								'list': result }
				});
			finished({});	
			return ;
		},
		
		'getPatchDDList' : function(messageObj, session, send, finished) {
			var pPatchIEN = messageObj.params.patchIEN;
				
			var result =[];
			var name;
			var fullFile;
			
			var root = new this.documentStore.DocumentNode('XPD', [9.6, pPatchIEN,4,0]);
			
			var ien;
			for (; ; ) {
				root = root.nextSibling;
				ien = root.name;

				if (isNaN(ien)) break; 
				name = vista.di.recordName(1, ien, this)
				fullFile = (piece(root.$(222).value,'^',3) === "f");
				result.push( {'fileNumber': ien, 'fileName': name, 'fullFile' : fullFile});							
			}; 
			
	
			send({
					type: 'displayPatchDDList',
					params:	{	'patchIEN' : pPatchIEN,
								'list': result }
				});
			finished({});	
			return ;
		},
		
		'getPatchDDDetails' : function(messageObj, session, send, finished) {
			var pPatchIEN = messageObj.params.patchIEN;
			var pFile = messageObj.params.file;
			var fileName = vista.di.fileName(pFile, this);
			
			var iens = pFile + ',' + pPatchIEN;
			var ddDetails = vista.di.recordByIEN(9.64, iens, "**", "R", this);
						
			send({
					type: 'displayPatchDDDetails',
					params: {	'ddDetails' : ddDetails.result,
								'file' : pFile,
								'fileName' : fileName
							}				
				});
			finished({});
			return;
		},
		
		'getPatchRequired' : function (messageObj, session, send, finished) {
			var pPatchIEN = messageObj.params.patchIEN;
		
			var requiredPatches = vista.di.recordByIEN(9.6, pPatchIEN, "11*", "R", this);
			
			requiredPatches = requiredPatches.result['9.611'];

			var list =[];
			var name,action;
			for (var i in requiredPatches) {
				name = requiredPatches[i]['REQUIRED BUILD'];
				action = requiredPatches[i]['ACTION']
				list.push( { 'name': name, 'action': action });
			};			
		
			send({
					type: 'displayPatchRequired',
					params: list
				});
			finished({});
			return;
		},
		
		'getPatchComponentDetails' : function(messageObj, session, send, finished) {				
			var pComponent = messageObj.params.component;
			var pIen = messageObj.params.ien;
			var pName = messageObj.params.name;
			
			switch (pComponent.file)
			{
			case 'DD':
				break;
			case '8994':	// RPC
				var rpc = getRPCDetails(pIen, this);
				send({
					type: 'displayRPCDetails',
					params: rpc
				});
				break;
			case '9.8':		// routine
				var routineName = pName;
				var routineTag = pName;
				
				var routineCode = vista.getRoutineCode(routineName, this);
				
				send({
					type: 'displayRoutine',
					params: {"routineName": routineName, "routineTag": routineTag, "routine": routineCode}
				});
				
				break;
			default :
				
				var detail = vista.di.recordByIEN(pComponent.file, pIen, "**", "ER", this);	// get External values and field names
								
				send({
					type: 'displayPatchComponentDetails',
					params: {'component': pComponent, 'detail' : detail.result, 'ien' : pIen, 'name' : pName}
				});
				break;
			}
			finished({});
			return;	
		},
			
		'getPatchRoutineList' : function(messageObj, session, send, finished) {
			var pPatchIEN = messageObj.params.patchIEN;
		
			var result = getPatchRoutineList(pPatchIEN, this); 
						
			send({
					type: 'displayPatchRoutineList',
					params: {'patchRoutineList': result}
				});
			finished({});
			return;
		},
		
		'getRoutine' : function(messageObj, session, send, finished) {
			// Set parameters
			var result = [];
			var pRoutineName = messageObj.params.routineName;
			var pRoutineTag = messageObj.params.routineTag;
		
			var routineCode = vista.getRoutineCode(pRoutineName, this); 
			
			send({
					type: 'displayRoutine',
					params: {"routineName": pRoutineName, "routineTag": pRoutineTag, "routine": routineCode}
				});
			finished({});
			return;
		},
		
		'executeRPC' : function(messageObj, session, send, finished) {
			var rpc = vista.rpc.new(messageObj.params.name, this);
				rpc.input = messageObj.params.input;
				rpc.duz = messageObj.params.duz;
				rpc.division = messageObj.params.division;
				rpc.context = messageObj.params.context; 
			
			var result = vista.rpc.execute(rpc, this);
			
			send({
					type: 'displayExecuteRPCResult',
					params: result
				});
			finished({});	
			return ;
		},
		
		'retrieveGlobalArray' : function(messageObj, session, send, finished) {
			var pGlobalName= messageObj.params.global;
			var pCallback = messageObj.params.callback;
			
			var root = pGlobalName.substring(1,pGlobalName.length-1).split('(')[0]; // e.g. "^TMP"
			
			var indices = pGlobalName.replace(/"/g,'').split('(')[1].split(')')[0].split(',');  // e.g. ["XYZ","123"]
			
			var tempGlobal = new this.documentStore.DocumentNode(root,indices);
			var result = tempGlobal.getDocument();
			send({
					type: pCallback,
					params: {'result': result }
				});
			finished({});
		},
		
		'getDDDefinition' : function(messageObj, session, send, finished) {
			var pFile = messageObj.params.file;

			var iens = pFile + ',';
			var fileName = vista.di.fileName(pFile, this);
			var detail = vista.di.recordByIEN(1, iens, "*", "ER", this);	// get External values and field names
			
			var ewdtemp = new this.documentStore.DocumentNode('TMP',['ewd',process.pid]); 
			ewdtemp.$('TMP').delete();
			var temp = getNA(ewdtemp._node,"TMP");  // e.g., ^TMP("ewd","3740","TMP")
			
			var res = this.db.function({function:"ddDefinition^nstDDUtil1",arguments:[pFile,temp]});
			
			var gl = ewdtemp.$('TMP').getDocument();
			ewdtemp.$('TMP').delete();
			
			send({
					type: 'displayDDDefinition',
					params: {'detail': detail.result[1][iens], 'file' : pFile, 'fileName' : fileName, 'gl' : gl }
				});
			finished({});
			return;
		},
		
		'getDDFieldDefinition' : function(messageObj, session, send, finished) {
			var pFile = messageObj.params.file;
			var pField = messageObj.params.field;

			var attributes = vista.di.fieldRetriever(pFile, pField, "", "", this);	// get all FileMan field attributes values
				
			send({
					type: 'displayDDField',
					params: {'attributes': attributes.result, 
							 'file' : pFile, 
							 'field' : { 'number' : pField,
										 'name' : attributes.result.LABEL}
							}
				});
			finished({});
			return;
		},
		
		'getDDData' : function(messageObj, session, send, finished) {
			var pFile = messageObj.params.file;

			var fields = vista.di.fileFields(pFile, this);
			var fileName = vista.di.fileName(pFile, this);
			
			// TODO
			send({
					type: 'displayDDData',
					params: {"fields": fields.result, 'file' : pFile, 'fileName' : fileName }
				});
			finished({});
			return;
		}
	}
};
