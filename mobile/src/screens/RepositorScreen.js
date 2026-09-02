import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RepositorScreen() {

  const [produtos, setProdutos] = useState([
    {
      id: '1',
      nome: 'Arroz 5kg',
      estoque: 20,
      preco: '25,90',
      exposto: false,
    },
    {
      id: '2',
      nome: 'Café 500g',
      estoque: 15,
      preco: '12,90',
      exposto: false,
    },
    {
      id: '3',
      nome: 'Açúcar 1kg',
      estoque: 30,
      preco: '5,99',
      exposto: false,
    },
  ]);


  function marcarExposto(id) {
    setProdutos(lista =>
      lista.map(produto =>
        produto.id === id
          ? { ...produto, exposto: true }
          : produto
      )
    );

    Alert.alert(
      'Produto atualizado',
      'Produto marcado como exposto na área de venda.'
    );
  }


  function atualizarPreco(produto) {

    Alert.alert(
      'Atualização de preço',
      `Nova tabela da administração:\n\n${produto.nome}\nNovo preço: R$ 14,90\n\nAplicar alteração?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Aplicar',
          onPress: () =>
            Alert.alert(
              'Sucesso',
              'Preço atualizado conforme tabela da administração.'
            )
        }
      ]
    );
  }


  function avisarAdministracao(produto) {

    Alert.alert(
      'Mensagem enviada',
      `Administração avisada:\n\nNecessário verificar ${produto.nome}.`
    );

  }


  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>
          Área do Repositor
        </Text>

        <Text style={styles.subtitle}>
          Organização, exposição e atualização de preços
        </Text>
      </View>


      <FlatList

        data={produtos}

        keyExtractor={(item)=>item.id}

        renderItem={({item})=>(

          <View style={styles.card}>

            <Text style={styles.product}>
              {item.nome}
            </Text>

            <Text>
              Estoque: {item.estoque} unidades
            </Text>

            <Text>
              Preço atual: R$ {item.preco}
            </Text>


            <View style={styles.status}>

              <Text>
                {item.exposto 
                ? '✅ Produto exposto'
                : '⏳ Aguardando exposição'}
              </Text>

            </View>



            <TouchableOpacity
              style={styles.button}
              onPress={()=>marcarExposto(item.id)}
            >
              <Text style={styles.buttonText}>
                Marcar exposto
              </Text>
            </TouchableOpacity>



            <TouchableOpacity
              style={styles.priceButton}
              onPress={()=>atualizarPreco(item)}
            >
              <Text style={styles.priceText}>
                Atualizar preço
              </Text>
            </TouchableOpacity>



            <TouchableOpacity
              style={styles.alertButton}
              onPress={()=>avisarAdministracao(item)}
            >
              <Text style={styles.alertText}>
                Avisar administração
              </Text>
            </TouchableOpacity>


          </View>

        )}

      />

    </SafeAreaView>
  );
}



const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:'#F1F5F9',
    padding:20
  },


  header:{
    marginBottom:20
  },


  title:{
    fontSize:24,
    fontWeight:'800',
    color:'#0F172A'
  },


  subtitle:{
    marginTop:5,
    color:'#64748B'
  },


  card:{
    backgroundColor:'#FFFFFF',
    padding:18,
    borderRadius:18,
    marginBottom:15
  },


  product:{
    fontSize:18,
    fontWeight:'800',
    marginBottom:8,
    color:'#0F172A'
  },


  status:{
    marginVertical:12
  },


  button:{
    backgroundColor:'#0B83B6',
    padding:12,
    borderRadius:10,
    marginBottom:8
  },


  buttonText:{
    color:'#FFFFFF',
    textAlign:'center',
    fontWeight:'700'
  },


  priceButton:{
    backgroundColor:'#DCFCE7',
    padding:12,
    borderRadius:10,
    marginBottom:8
  },


  priceText:{
    color:'#166534',
    textAlign:'center',
    fontWeight:'700'
  },


  alertButton:{
    backgroundColor:'#FEE2E2',
    padding:12,
    borderRadius:10
  },


  alertText:{
    color:'#991B1B',
    textAlign:'center',
    fontWeight:'700'
  }

});
