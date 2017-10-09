nstNodeUtils ; NST - Utilities for Node.js ; 09/15/2016  9:38PM
 ;;
 ;;	Author: Nikolay Topalov
 ;;
 ;;	Copyright 2014 - 2016 Nikolay Topalov
 ;;
 ;;	Licensed under the Apache License, Version 2.0 (the "License");
 ;;	you may not use this file except in compliance with the License.
 ;;	You may obtain a copy of the License at
 ;;
 ;;	http://www.apache.org/licenses/LICENSE-2.0
 ;;
 ;;	Unless required by applicable law or agreed to in writing, software
 ;;	distributed under the License is distributed on an "AS IS" BASIS,
 ;;	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 ;;	See the License for the specific language governing permissions and
 ;;	limitations under the License.
 ;;
 Q
 ;
getRoutine(TMP) ; Return a rouitne
 ; @TMP@("input",0,"value") is the routine name
 N DIF,XCNP,X
 N SRC
 ;
 S X=@TMP@("input",0,"value")  ; routine name
 ;  
 S DIF="SRC(",XCNP=0
 X ^%ZOSF("LOAD")
 M @TMP@("result")=SRC
 Q 1
 ;
getPatchRoutineList(TMP) ; Return a rouitne list for a patch
 ; @TMP@("input","patchIEN") is the patch ien
 N X,Y
 N name,root 
 N counter,result
 ;
 S pPatchIEN=@TMP@("input","patchIEN")  ; patch IEN
 ;
 S root=$NA(^XPD(9.6,pPatchIEN,"KRN",9.8,"NM"))
 S name=""
 s counter=0
 F  S name=$O(@root@("B",name))  Q:name=""  D		
 . S counter=counter+1
 . S X=name X ^%ZOSF("RSUM1")
 . S result(counter,"name")=name
 . S result(counter,"checksum")=Y
 . S result(counter,"comments")=$P($T(+1^@name),";",2)
 . S result(counter,"patches")=$P($T(+2^@name),"**",2)
 . S result(counter,"datetimeUpdated")=$P($T(+1^@name),";",3)
 . Q
 M @TMP@("result")=result
 Q 1
 ;
getFileRecordByIEN(TMP) ; Return a file record by file and IEN
 ; @TMP@("input","pFile")
 ; @TMP@("input","pIEN")
 ; @TMP@("input","pFields")  
 ; @TMP@("input","pFlags")
 ;
 N pFile,pIEN,pFields,pFlags
 N OUT,ERR
 S pFile=@TMP@("input","pFile")
 S pIEN=@TMP@("input","pIEN")
 S pFields=@TMP@("input","pFields")
 S pFlags=@TMP@("input","pFlags")
 ;
 S:pFields="" pFields="**"  ; default all fields  
 ;
 D GETS^DIQ(pFile,pIEN_",",pFields,pFlags,"OUT","ERR")
 I $D(ERR("DIERR")) D  Q "{""success"" : ""0""}"
 . M @TMP@("error")=ERR
 . Q
 M @TMP@("result")=OUT
 Q "{""success"" : ""1""}"
 ;
getFileFields(TMP) ; Return a file field names
 ; @TMP@("input","pFile")
 ;
 K @TMP@("result")
 N pFile
 N tI,tList,tFldId
 S pFile=@TMP@("input","pFile")
 ;
 S tI=0
 F  S tI=$O(^DD(pFile,"B",tI)) Q:tI=""  D       ; IA #5551
 . S tFldId=$O(^DD(pFile,"B",tI,""))
 . S tList(fldId,"name")=tI
 . S tList(fldId,"type")=$$GET1^DID(pFile,tFldId,"","SPECIFIER")
 . Q
 M @TMP@("result")=tList
 Q "{""success"" : ""1""}"
 ;
getFieldAttributes(TMP) ; Return a FileMan field attributes
 ; @TMP@("input","pFile")
 ; @TMP@("input","pField")  
 ; @TMP@("input","pFlags")
 ; @TMP@("input","pAttributes")
 ;
 N pFile,pField,pFlags,pAttributes
 N OUT,ERR
 S pFile=@TMP@("input","pFile")
 S pField=@TMP@("input","pField")
 S pFlags=@TMP@("input","pFlags")
 S pAttributes=@TMP@("input","pAttributes")
 ;
 K @TMP@("error")
 K @TMP@("result")
 ;
 S:pAttributes="" pAttributes="*"  ; default all fields
 D FIELD^DID(pFile,pField,pFlags,pAttributes,"OUT","ERR")
 I $D(ERR("DIERR")) D  Q "{""success"" : ""0""}"
 . M @TMP@("error")=ERR
 . Q
 M @TMP@("result")=OUT
 Q "{""success"" : ""1""}"
 ;
FIND1DIC(pFile,pValue)  ; find an exact record in a FileMan file - returns IEN, ignores errors
 Q $$FIND1^DIC(pFile,"","QX",pValue)
 ;
GET1DID(pFile) ; returns FileMan file name by file number
 Q $$GET1^DID(pFile,"","","NAME")