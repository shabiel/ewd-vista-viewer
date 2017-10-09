nstDDUtil1 ; NST - Utilities for FileMan definition ; 05/07/2014  9:38PM
 ;;
 ;;	Author: Nikolay Topalov
 ;;
 ;;	Copyright 2014 Nikolay Topalov
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
ddDefinition(pFileNumber,TMP) ; return DD definition by FileMan file number
 N counter,counterComputed,cnt,globalLocation,subscript,position,root
 N fieldName,fieldNumber,subFileNum,X,U
 ; 
 K @TMP
 S U="^"
 ;
 S root=$$ROOT^DILFD(pFileNumber)
 S counter=-1
 S counterComputed=-1
 S subscript=""
 S @TMP@("fileNumber")=pFileNumber
 S @TMP@("fileName")=$O(^DD(pFileNumber,0,"NM",""))
 S @TMP@("fileRoot")=root
 ;
 S subscript=""
 F  S subscript=$O(^DD(pFileNumber,"GL",subscript)) Q:subscript=""  D
 . S counter=counter+1
 . S subscript(subscript)=counter
 . Q
 ;
 S fieldNumber=0
 F  S fieldNumber=$O(^DD(pFileNumber,fieldNumber)) Q:'fieldNumber  D
 . S fieldName=$P(^DD(pFileNumber,fieldNumber,0),"^",1)
 . S globalLocation=$P(^DD(pFileNumber,fieldNumber,0),U,4)
 . S subscript=$P(globalLocation,";",1)
 . S position=$P(globalLocation,";",2)
 . ;
 . I globalLocation=" " Q  // e.g., .001 field
 . I globalLocation=" ; " D  Q
 . . S counterComputed=counterComputed+1
 . . S @TMP@("computed",counterComputed,"fieldNumber")=fieldNumber
 . . S @TMP@("computed",counterComputed,"fieldName")=fieldName
 . . Q
 . ;
 . S cnt=+$G(subscript(subscript))
 . S @TMP@("storage",cnt,"subscript")=subscript
 . S:position @TMP@("storage",cnt,"piece",position,"fieldNumber")=fieldNumber
 . S:position @TMP@("storage",cnt,"piece",position,"fieldName")=fieldName
 . I position=0 D
 . . S subFileNum=+$P(^DD(pFileNumber,fieldNumber,0),"^",2)
 . . S @TMP@("storage",cnt,"subfile","fieldNumber")=fieldNumber
 . . S @TMP@("storage",cnt,"subfile","fieldName")=fieldName
 . . S X=$$ddDefinition^nstDDUtil1(subFileNum,$NA(@TMP@("storage",cnt,"subfile")))
 . . Q
 . Q
 Q 1