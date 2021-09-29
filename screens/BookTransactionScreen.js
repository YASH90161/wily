import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Image, StyleSheet, Touchable,KeyboardAvoidingView, ToastAndroid, Alert } from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import db from '../config'

export default class TransactionScreen extends React.Component {
    constructor(){
      super();
      this.state = {
        hasCameraPermissions: null,
        scanned: false,
        scannedBookId: '',
        scannedStudentId:'',
        buttonState: 'normal',
        transactionMessage:''
      }
    }

    getCameraPermissions = async (id) =>{
      const {status} = await Permissions.askAsync(Permissions.CAMERA);
      
      this.setState({
        /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
        hasCameraPermissions: status === "granted",
        buttonState: id,
        scanned: false
      });
    }

    handleBarCodeScanned = async({type, data})=>{
      const {buttonState} = this.state

      if(buttonState==="BookId"){
        this.setState({
          scanned: true,
          scannedBookId: data,
          buttonState: 'normal'
        });
      }
      else if(buttonState==="StudentId"){
        this.setState({
          scanned: true,
          scannedStudentId: data,
          buttonState: 'normal'
        });
      }
      
    }

    handleTransaction=async()=>{
     var transactionType=await checkBookEligibility();
     if(!transactionType){
       Alert.alert("The book does exist in the library")
       this.setState({
         scannedBookId='',
         scannedStudentId:''
       })
     }

     else if(transactionType==='Issue'){
       var isStudentEligible= await this.checkStudentEligibilityForBookIssue()
       if(isStudentEligible){
         this.initiateBookIssue();
         Alert.alert("The book is issued")
       }
     }

     else{
       var isStudentEligible= await this.checkStudentEligibilityForBookReturn();
       if(isStudentEligible){
         this.initiateBookReturn();
         Alert.alert("The book is returned")
       }
     }


    }
    
    checkStudentEligibilityForBookIssue=async()=>{
      const studentRef = await db.collection("students").where("studentId","==",this.state.scannedStudentId).get()
      var isStudentEligible=""
      if(studentRef.doc.length==0){
        this.setState({
          scannedBookId:'',
          scannedStudentId:''
        })
        isStudentEligible=false
        Alert.alert("The student does not exist in my database")
      }

      else{
        studentRef.docs.map((doc)=>{
          var student= doc.data();
          if(student.NumberOfBooksIssued<2){
            isStudentEligible=true
          }
          else{
            isStudentEligible=false
            Alert.alert("Student had already borrowed 2 books")
            this.setState({
              scannedBookId:'',
              scannedStudentId:''
            })
          }
        })
      }
      return isStudentEligible;
    }
    checkBookEligibility=async()=>{
      const bookRef = await db.collection("books").where("bookId","==",this.state.scannedBookId).get()
      var transactionType=''
      if(bookRef.docs.length==0){
        transactionType=false
        this.setState({
          scannedBookId:'',
          scannedStudentId:''
        })
      }
      else{
        bookRef.docs.map((doc)=>{
          var book = doc.data();
          if(book.bookAvailability){
            transactionType="Issue"
          }
          else{
            transactionType = "Return"
          }
        })
      }
      return transactionType
      
    }
    
    checkStudentEligibilityForBookReturn=async()=>{
      const transactionRef=await db.collection("transactions").where("bookId","==",this.state.scannedBookId).limit(1).get()
      var isStudentEligible =''
      transactionRef.docs.map((doc)=>{
        var lastBookTransaction=doc.data();
        if(lastBookTransaction.studentId===this.state.scannedStudentId){
          isStudentEligible=true

        }
        else{
          isStudentEligible = false
          Alert.alert("The book was not issued to this student")
          this.setState({
            scannedBookId:'',
            scannedStudentId:''
          })
        }
        

      })
      return isStudentEligible
    }

    initiateBookIssue=async()=>{
      db.collection("transactions").add({
        studentId:this.state.scannedStudentId,
        bookId: this.state.scannedBookId,
        date: firebase.firestore.timestamp.now().toDate(),
        transactionType="Issue"

      })

      db.collection("books").doc(this.scannedBookId).update({
        bookAvailability:false
      })

      db.collection("students").doc(this.scannedStudentId).update({
        NumberOfBooksIssued:firebase.firestore.FieldValue.increment(1)
      })

      Alert.alert("Book Issued")

      this.setState({
        scannedBookId:'',
        scannedStudentId:''
      })
    }

    initiateBookReturn=async()=>{
      db.collection("transactions").add({
        studentId:this.state.scannedStudentId,
        bookId:this.state.scannedBookId,
        date:firebase.firestore.timestamp.now().toDate(),
        transactionType="Return"
      })
      db.collection("books").doc(this.scannedBookId).update({
        bookAvailability:true
      })
      db.collection("students").doc(this.scannedStudentId).update({
        NumberOfBooksIssued:firebase.firestore.FieldValue.increment(-1)
      })
      Alert.alert("Book Returned")

      this.setState({
        scannedBookId:'',
        scannedStudentId:''
      })


    }
    render() {
      const hasCameraPermissions = this.state.hasCameraPermissions;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if (buttonState !== "normal" && hasCameraPermissions){
        return(
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        );
      }

      else if (buttonState === "normal"){
        return(
          <KeyboardAvoidingView  style={styles.container} behavior="padding" enabled>
            <View>
              <Image
                source={require("../assets/booklogo.jpg")}
                style={{width:200, height: 200}}/>
              <Text style={{textAlign: 'center', fontSize: 30}}>Wily</Text>
            </View>
            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Book Id"
              onChangeText={text =>this.setState({scannedBookId:text})}
              value={this.state.scannedBookId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("BookId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>

            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Student Id"
              onChangeText ={text => this.setState({scannedStudentId:text})}
              value={this.state.scannedStudentId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("StudentId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={async()=>{
                var transactionMessage = this.handleTransaction();
                this.setState(
                  {scannedBookId:'',
                   scannedStudentId:''})
              }}>
          <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        );
      }
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    displayText:{
      fontSize: 15,
      textDecorationLine: 'underline'
    },
    scanButton:{
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10
    },
    buttonText:{
      fontSize: 15,
      textAlign: 'center',
      marginTop: 10
    },
    inputView:{
      flexDirection: 'row',
      margin: 20
    },
    inputBox:{
      width: 200,
      height: 40,
      borderWidth: 1.5,
      borderRightWidth: 0,
      fontSize: 20
    },
    scanButton:{
      backgroundColor: '#66BB6A',
      width: 50,
      borderWidth: 1.5,
      borderLeftWidth: 0
    },
    submitButton:{
      backgroundColor: '#FBC02D',
      width: 100,
      height:50
    },
    submitButtonText:{
      padding: 10,
      textAlign: 'center',
      fontSize: 20,
      fontWeight:"bold",
      color: 'white'
    }
  });