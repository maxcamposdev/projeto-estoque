import React from 'react';
import {
SafeAreaView,
Text,
StyleSheet,
View,
TouchableOpacity
} from 'react-native';


export default function PrecosScreen(){

return(

<SafeAreaView style={styles.container}>


<Text style={styles.title}>
🏷️ Atualização de preços
</Text>


<View style={styles.card}>

<Text style={styles.produto}>
Arroz 5kg
</Text>


<Text>
Preço atual: R$ 22,90
</Text>


<Text>
Novo preço: R$ 24,90
</Text>



<TouchableOpacity style={styles.button}>

<Text style={styles.buttonText}>
Confirmar atualização
</Text>

</TouchableOpacity>


</View>



</SafeAreaView>

)

}



const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:'#F1F5F9',
padding:20
},


title:{
fontSize:24,
fontWeight:'900'
},


card:{
backgroundColor:'#fff',
padding:20,
borderRadius:18,
marginTop:20
},


produto:{
fontSize:18,
fontWeight:'800',
marginBottom:10
},


button:{
backgroundColor:'#0B83B6',
padding:15,
borderRadius:12,
marginTop:20,
alignItems:'center'
},


buttonText:{
color:'#fff',
fontWeight:'800'
}


});
