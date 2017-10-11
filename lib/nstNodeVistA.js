/*
  VistA Utilities for EWD 3
  Author: Nikolay Topalov

  Copyright 2014 - 2106 Nikolay Topalov

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

// simple $piece implementation
var piece = function(str,delimiter,position) {
    
  if (str === undefined) return '';
  var buf = str.split(delimiter);
  return (buf[position-1] === undefined) ? '' : buf[position-1]; 
    
};

// return a global node as a string   
var getNA = function(pGlobalNode) {  //,'^' + ewd.temp.globalName + '("' + ewd.temp.subscripts.join('","') + '","RPC")'; 
    
  var globalName = '^' + pGlobalNode.global + '('; 
  
  if (pGlobalNode.subscripts.length > 0) {
    globalName +=  '"' + pGlobalNode.subscripts.join('","') + '"';
  }
  
  if (arguments.length > 1) {
    var args = [];
    for (var i = 1; i < arguments.length; i += 1) {
      args.push(arguments[i]);
    }
    if (pGlobalNode.subscripts.length > 0) {
      globalName += ',';
    }
    globalName += '"' + args.join('","') + '"';
  }
  
  globalName += ')';
  
  return globalName;   
};

module.exports = {
  rpc: { 
    'new': function(pRPCName) {
      var result = {'name' : pRPCName, 'input': []};
      return result;
    },

    execute: function(pRPC,ewd) {
      var ewdtemp = new ewd.documentStore.DocumentNode('TMP',['ewd',process.pid]); 
      ewdtemp.$('RPC').delete();  
      ewdtemp.$('RPC').setDocument(pRPC);
      var temp = getNA(ewdtemp._node,'RPC');  // e.g., ^TMP('ewd','3740','RPC')
      
      var str = ewd.db.function({function:'rpcExecute^nstRPCWrapper',arguments:[temp]});
      var result = JSON.parse(str.result);

      if (result.success) {
        result.result = ewdtemp.$('RPC').$('result').getDocument();
        result.callback = pRPC.callback;
      }

      ewdtemp.$('RPC').delete();
      
      return result;  
    }
  },
  di : {
    /* 
     * $$EXTERNAL^DILFD(FILE,FIELD,FLAGS,INTERNAL,MSG_ROOT)
     */
    FieldExternalValue : function(pFile, pField, pFlags, pIntValue,ewd) {
      var res = ewd.db.function({function:'EXTERNAL^DILFD',arguments:[pFile,pField,pFlags,pIntValue]});
      return res.result;    
    },

    /*
     *  returns FileMan file name by file number
     *  $$GET1^DID(FILE,"","","NAME")
     */
    fileName: function(pFile, ewd) {
      var res = ewd.db.function({function:'GET1DID^nstNodeUtils',arguments:[pFile]});
      return res.result;    
    },

    /* 
     *  returns FileMan file record name (field .01)
     *  $$GET1^DIQ(pFile,pIEN,.01)
     */
    recordName: function(pFile, pIEN, ewd) {
      var res = ewd.db.function({function:'GET1^DIQ',arguments :[pFile,pIEN,'.01']});
      return res.result;    
    },

    /*  
     *  find a record in a FileMan file - returns IEN, ignores errors
     *  $$FIND1^DIC(FILE,IENS,FLAGS,[.]VALUE,[.]INDEXES,[.]SCREEN,MSG_ROOT)
     */
    findExactMatchByName: function(pFile, pValue, ewd) {

      //var res = ewd.db.function({function:'FIND1^DIC',arguments: [pFile,'','QX',pValue]});  // '' causes an issue 
      var res = ewd.db.function({function:'FIND1DIC^nstNodeUtils',arguments: [pFile,pValue]});
      return res.result;  
    },

    /*  returns FileMan file global root 
     *  $$ROOT^DILFD(FILE)
    */
    fileRoot: function(pFile, ewd) {    
      var res = ewd.db.function({function:'ROOT^DILFD',arguments: [pFile]});
      return res.result;    
    },

    /*
     *  GETS^DIQ(pFile,pIEN_",",pFields,pFlags,"OUT","ERR")
     */
    recordByIEN: function(pFile, pIEN, pFields, pFlags, ewd) {
      var params = {input: {}};

      params.input.pFile = pFile;
      params.input.pIEN = pIEN;
      params.input.pFlags = pFlags;
      params.input.pFields = pFields;
      
      var ewdtemp = new ewd.documentStore.DocumentNode('TMP',['ewd',process.pid]); 
      
      ewdtemp.$('TMP').delete();
      ewdtemp.$('TMP').setDocument(params);
      var temp = getNA(ewdtemp._node,'TMP');  // e.g., ^TMP("ewd","3740","TMP")
      
      var str = ewd.db.function({function:'getFileRecordByIEN^nstNodeUtils', arguments: [temp]});
      var result = JSON.parse(str.result);

      if (result.success) {
        result.result = ewdtemp.$('TMP').$('result').getDocument();
      } else {
        result.error = ewdtemp.$('TMP').$('error').getDocument();
      }
      
      ewdtemp.$('TMP').delete();    
      return result;
    },

    /*
     *  returns a list with all fields in a file
     *  $$GET1^DID(pFile,fldId,"","SPECIFIER")
     */
    fileFields: function(pFile,ewd) {
      var params = {input: {}};

      params.input.pFile = pFile;
      
      var ewdtemp = new ewd.documentStore.DocumentNode('TMP',['ewd',process.pid]); 
      ewdtemp.$('TMP').delete();
      ewdtemp.$('TMP').setDocument(params);
      var temp = getNA(ewdtemp._node,'TMP');  // e.g., ^TMP("ewd","3740","TMP")
      
      var str = ewd.db.function({function:'getFileFields^nstNodeUtils', arguments : [temp]});
      var result = JSON.parse(str.result);
      
      if (result.success) {
        result.result = ewdtemp.$('TMP').$('result').getDocument();
      } else {
        result.error = ewdtemp.$('TMP').$('error').getDocument();
      }
      
      ewdtemp.$('TMP').delete();    
      return result;
    },

    // return number of records in a node
    getRecordsCounter: function(node) {

      var tmp = node.$('0').value;
      var counter = piece(tmp,'^',4);   // number of records
      return counter; 
    },
    
    /*
     * return FileMan field attributes
     * D FIELD^DID(pFilepField,pFlags,pAttributes,"OUT","ERR")
     */
    fieldRetriever: function(pFile, pField, pFlags, pAttributes,ewd) {
      var params = {input: {}};
      
      if (pField.substr(0,2) == '0.') pField = pField.substr(1);

      params.input.pFile = pFile;
      params.input.pField = pField;
      params.input.pFlags = pFlags;
      params.input.pAttributes = pAttributes;

      
      var ewdtemp = new ewd.documentStore.DocumentNode('TMP',['ewd',process.pid]); 
      ewdtemp.$('TMP').delete();
      ewdtemp.$('TMP').setDocument(params);
      var temp = getNA(ewdtemp._node,'TMP');  // e.g., ^TMP("ewd","3740","TMP")
      
      var str = ewd.db.function({function:'getFieldAttributes^nstNodeUtils', arguments: [temp]});
      var result = JSON.parse(str.result);

      if (result.success) {
        result.result = ewdtemp.$('TMP').$('result').getDocument();
      } else {
        result.error = ewdtemp.$('TMP').$('error').getDocument();
      }

      ewdtemp.$('TMP').delete();    
      return result;
    }
  },

  getNA: getNA,
  
  // returns M routine code
  getRoutineCode: function(pRoutineName,ewd) {
    // Cache stores routines in ^ROUTINE
    //var root = new ewd.documentStore.DocumentNode('ROUTINE', [params.routineName]);   
    //var routine = root.getDocument();
    
    // use function to get the routine code
    var param = {'input': [ {'value' : pRoutineName} ]};
    var tempGlobal = new ewd.documentStore.DocumentNode('TMP',['ewd',process.pid,'RPC']);
    tempGlobal.delete();
    tempGlobal.setDocument(param);
    var result = [];
    
    var tmp = getNA(tempGlobal._node);  // e.g., ^TMP("ewd","3740","RPC")
    var res = ewd.db.function({function:'getRoutine^nstNodeUtils',arguments : [tmp]});
    
    var routineCode = tempGlobal.$('result').getDocument(true,1);

    for (var i = 0; i < routineCode.length; i += 1) {
      result.push(routineCode[i][0]);     
    }
    //for (var i in routineCode) { result.push(routineCode[i][0]); };
    
    tempGlobal.delete();
    
    return result;
  }
};
