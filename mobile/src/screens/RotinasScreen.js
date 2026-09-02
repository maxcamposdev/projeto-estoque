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

import api from '../services/api';


export default function RotinaScreen() {

  const [rotinas, setRotinas] = useState([]);
  const [carregando, setCarregando] = useState(true);


  async function carregarRotinas(){

    try {

      const resposta = await api.get('/rotinas');

      setRotinas(resposta.data);

    } catch(error){

      console.log(
        "Erro buscando rotina:",
        error.response?.data || error.message
      );


      // dados de demonstração caso API ainda não tenha retorno
      setRotinas([
        {
          id:1,
          titulo:"Receber Nota Fiscal 45892",
          tipo:"recebimento",
          descricao:"Conferir produtos entregues pelo fornecedor",
          status:"Pendente"
        },

        {
          id:2,
          titulo:"Atualizar preços da tabela",
          tipo:"preco",
          descricao:"Alteração enviada pela administração",
          status:"Pendente"
        },

        {
          id:3,
          titulo:"Reposição setor bebidas",
          tipo:"reposicao",
          descricao:"Organizar produtos na área de venda",
          status:"Pendente"
        }
      ]);

    } finally {

      setCarregando(false);

    }

  }



  useEffect(()=>{

    carregarRotinas();

  },[]);



  async function concluirRotina(id){

    try {

      await api.patch(`/rotinas/${id}/concluir`);


      Alert.alert(
        "Sucesso",
        "Rotina concluída"
      );


      carregarRotinas();


    }catch(error){

      Alert.alert(
        "Demonstração",
        "Rotina marcada como concluída"
      );


      setRotinas(
        rotinas.map(item =>
          item.id === id
          ?
          {...item,status:"Concluído"}
          :
          item
        )
      );

    }

  }



  return (

    <SafeAreaView style={styles.container}>

      <ScrollView>


        <Text style={styles.titulo}>
          Rotina
        </Text>


        <Text style={styles.subtitulo}>
          Atividades enviadas pela administração
        </Text>



        {
          carregando ?

          <Text>
            Carregando...
          </Text>


          :


          rotinas.map(item=>(

            <View 
              key={item.id}
              style={styles.card}
            >


              <Text style={styles.tipo}>
                {item.tipo?.toUpperCase()}
              </Text>


              <Text style={styles.nome}>
                {item.titulo}
              </Text>


              <Text style={styles.descricao}>
                {item.descricao}
              </Text>


              <Text style={styles.status}>
                Status: {item.status}
              </Text>



              <TouchableOpacity
                style={styles.botao}
                onPress={()=>concluirRotina(item.id)}
              >

                <Text style={styles.botaoTexto}>
                  Finalizar tarefa
                </Text>

              </TouchableOpacity>



            </View>

          ))

        }


      </ScrollView>

    </SafeAreaView>

  );

}




const styles = StyleSheet.create({

container:{
 flex:1,
 backgroundColor:'#F1F5F9',
 padding:20
},


titulo:{
 fontSize:28,
 fontWeight:'800',
 color:'#0F172A'
},


subtitulo:{
 marginTop:5,
 marginBottom:20,
 color:'#64748B'
},


card:{
 backgroundColor:'#FFFFFF',
 borderRadius:18,
 padding:18,
 marginBottom:15
},


tipo:{
 color:'#0B83B6',
 fontWeight:'800',
 fontSize:12
},


nome:{
 fontSize:18,
 fontWeight:'800',
 marginTop:8,
 color:'#0F172A'
},


descricao:{
 marginTop:8,
 color:'#475569'
},


status:{
 marginTop:12,
 fontWeight:'700'
},


botao:{
 marginTop:15,
 backgroundColor:'#0B83B6',
 padding:12,
 borderRadius:10,
 alignItems:'center'
},


botaoTexto:{
 color:'#FFFFFF',
 fontWeight:'800'
}


});
