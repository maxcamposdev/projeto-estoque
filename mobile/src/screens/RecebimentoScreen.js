import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';

export default function RecebimentoScreen() {

  const [notas, setNotas] = useState([
    {
      id: 1,
      numero: "NF-1025",
      fornecedor: "Fornecedor Exemplo",
      produtos: 15,
      status: "Aguardando conferência"
    },
    {
      id: 2,
      numero: "NF-1026",
      fornecedor: "Distribuidora Central",
      produtos: 32,
      status: "Aguardando conferência"
    }
  ]);

  function conferirNota(id) {

    setNotas(
      notas.map(nota =>
        nota.id === id
          ? {...nota, status:"Recebimento confirmado"}
          : nota
      )
    );

    Alert.alert(
      "Recebimento registrado",
      "A entrada foi registrada e enviada para atualização do estoque."
    );
  }


  return (
    <SafeAreaView style={styles.container}>

      <ScrollView>

        <Text style={styles.titulo}>
          Recebimento de Mercadorias
        </Text>

        <Text style={styles.subtitulo}>
          Notas programadas para entrada
        </Text>


        {notas.map(nota => (

          <View key={nota.id} style={styles.card}>

            <Text style={styles.nota}>
              {nota.numero}
            </Text>

            <Text>
              Fornecedor: {nota.fornecedor}
            </Text>

            <Text>
              Produtos: {nota.produtos}
            </Text>

            <Text style={styles.status}>
              {nota.status}
            </Text>


            {nota.status !== "Recebimento confirmado" && (

              <TouchableOpacity
                style={styles.botao}
                onPress={() => conferirNota(nota.id)}
              >

                <Text style={styles.botaoTexto}>
                  Conferir e dar entrada
                </Text>

              </TouchableOpacity>

            )}

          </View>

        ))}


      </ScrollView>

    </SafeAreaView>
  );
}



const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F1F5F9",
padding:20
},

titulo:{
fontSize:24,
fontWeight:"800",
color:"#0F172A",
marginBottom:5
},

subtitulo:{
color:"#64748B",
marginBottom:20
},

card:{
backgroundColor:"#FFFFFF",
padding:18,
borderRadius:16,
marginBottom:15
},

nota:{
fontSize:18,
fontWeight:"800",
color:"#0B83B6"
},

status:{
marginTop:10,
fontWeight:"700",
color:"#16A34A"
},

botao:{
backgroundColor:"#0B83B6",
padding:14,
borderRadius:12,
marginTop:15,
alignItems:"center"
},

botaoTexto:{
color:"#FFFFFF",
fontWeight:"800"
}

});
