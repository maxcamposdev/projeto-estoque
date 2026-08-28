// scripts/seed-images-by-product.js — Imagens ilustrativas baseadas no NOME do produto
require('dotenv').config();
const db = require('../src/config/db');

// ============================================================
// DICIONÁRIO: palavra em PT → tags em inglês para LoremFlickr
// (a primeira palavra-chave encontrada no nome do produto vence)
// ============================================================
const DICIONARIO = [
  // Higiene / limpeza pessoal
  ['creme dental', 'toothpaste'],
  ['pasta de dente', 'toothpaste'],
  ['escova de dente', 'toothbrush'],
  ['shampoo', 'shampoo'],
  ['condicionador', 'conditioner'],
  ['sabonete', 'soap,bar'],
  ['desodorante', 'deodorant'],
  ['perfume', 'perfume'],
  ['barbeador', 'razor'],
  ['lamina de barbear', 'razor,blade'],
  ['papel higienico', 'toilet paper'],
  ['absorvente', 'sanitary pad'],
  ['fralda', 'diaper'],
  ['algodao', 'cotton'],
  ['cotonete', 'cotton swab'],

  // Limpeza doméstica
  ['detergente', 'detergent'],
  ['sabao', 'soap,bar'],
  ['agua sanitaria', 'bleach,bottle'],
  ['desinfetante', 'disinfectant'],
  ['amaciante', 'fabric softener'],
  ['esponja', 'sponge'],
  ['paninho', 'cleaning cloth'],
  ['rodo', 'squeegee'],
  ['vassoura', 'broom'],
  ['balde', 'bucket'],
  ['lixeira', 'trash can'],
  ['limpa vidros', 'glass cleaner'],

  // Escritório / papelaria
  ['caneta marca texto', 'highlighter,marker'],
  ['caneta', 'pen'],
  ['lapis', 'pencil'],
  ['borracha', 'eraser'],
  ['apontador', 'sharpener'],
  ['caderno', 'notebook'],
  ['agenda', 'planner'],
  ['bloco', 'notepad'],
  ['papel', 'paper'],
  ['envelope', 'envelope'],
  ['grampeador', 'stapler'],
  ['grampo', 'staple'],
  ['clips', 'paperclip'],
  ['fita adesiva', 'tape,adhesive'],
  ['cola', 'glue'],
  ['tesoura', 'scissors'],
  ['estilete', 'cutter'],
  ['regua', 'ruler'],
  ['calculadora', 'calculator'],
  ['pasta', 'folder'],
  ['arquivo', 'file'],
  ['tinta', 'ink'],

  // Eletrônicos
  ['smartphone', 'smartphone'],
  ['celular', 'phone'],
  ['iphone', 'iphone'],
  ['notebook', 'laptop'],
  ['laptop', 'laptop'],
  ['computador', 'computer'],
  ['monitor', 'monitor'],
  ['teclado', 'keyboard'],
  ['mouse', 'computer mouse'],
  ['impressora', 'printer'],
  ['scanner', 'scanner'],
  ['roteador', 'router'],
  ['modem', 'modem'],
  ['hd externo', 'hard drive'],
  ['pen drive', 'usb flash drive'],
  ['cabo', 'cable'],
  ['carregador', 'charger'],
  ['fone', 'headphones'],
  ['headphone', 'headphones'],
  ['caixa de som', 'speaker'],
  ['soundbar', 'soundbar'],
  ['microfone', 'microphone'],
  ['webcam', 'webcam'],
  ['tablet', 'tablet'],
  ['smartwatch', 'smartwatch'],
  ['tv', 'television'],
  ['televisao', 'television'],
  ['camera', 'camera'],
  ['lampada', 'bulb'],
  ['lampada led', 'led bulb'],
  ['pilha', 'battery'],
  ['bateria', 'battery'],
  ['ventilador', 'fan'],
  ['ar condicionado', 'air conditioner'],

  // Cozinha / utilidades domésticas
  ['garrafa termica', 'thermos,bottle'],
  ['garrafa', 'bottle'],
  ['copo', 'cup'],
  ['caneca', 'mug'],
  ['xicara', 'cup'],
  ['prato', 'plate'],
  ['talher', 'cutlery'],
  ['faca', 'knife'],
  ['colher', 'spoon'],
  ['garfo', 'fork'],
  ['panela', 'pan'],
  ['frigideira', 'frying pan'],
  ['assadeira', 'baking tray'],
  ['forma', 'mold'],
  ['liquidificador', 'blender'],
  ['batedeira', 'mixer'],
  ['microondas', 'microwave'],
  ['fogao', 'stove'],
  ['geladeira', 'refrigerator'],
  ['freezer', 'freezer'],
  ['forno', 'oven'],
  ['cafeteira', 'coffee maker'],
  ['chaleira', 'kettle'],
  ['sanduicheira', 'sandwich maker'],
  ['airfryer', 'air fryer'],
  ['coifa', 'range hood'],
  ['potes', 'container'],
  ['tupperware', 'container'],
  ['espremedor', 'squeezer'],
  ['abridor', 'opener'],
  ['rolo de massa', 'rolling pin'],
  ['tabua', 'cutting board'],

  // Alimentação / bebidas
  ['cafe', 'coffee'],
  ['cha', 'tea'],
  ['achocolatado', 'chocolate milk'],
  ['leite', 'milk'],
  ['suco', 'juice'],
  ['agua', 'water'],
  ['refrigerante', 'soda'],
  ['cerveja', 'beer'],
  ['vinho', 'wine'],
  ['arroz', 'rice'],
  ['feijao', 'beans'],
  ['macarrao', 'pasta,noodles'],
  ['massa', 'pasta,noodles'],
  ['molho de tomate', 'tomato sauce'],
  ['oleo', 'oil'],
  ['azeite', 'olive oil'],
  ['acucar', 'sugar'],
  ['sal', 'salt'],
  ['farinha', 'flour'],
  ['fuba', 'cornmeal'],
  ['biscoito', 'cookie'],
  ['bolacha', 'cookie'],
  ['chocolate', 'chocolate'],
  ['barra de cereal', 'cereal bar'],
  ['granola', 'granola'],
  ['mel', 'honey'],
  ['geleia', 'jam'],
  ['pao', 'bread'],
  ['pao de forma', 'bread'],
  ['geleia de', 'jam'],
  ['atum', 'tuna'],
  ['sardinha', 'sardine'],
  ['milho', 'corn'],
  ['ervilha', 'peas'],
  ['atum em lata', 'canned tuna'],

  // Ferramentas / construção
  ['martelo', 'hammer'],
  ['marreta', 'sledgehammer'],
  ['chave de fenda', 'screwdriver'],
  ['chave philips', 'phillips screwdriver'],
  ['chave inglesa', 'wrench'],
  ['alicate', 'pliers'],
  ['furadeira', 'drill'],
  ['parafusadeira', 'drill'],
  ['serra', 'saw'],
  ['serrote', 'saw'],
  ['prego', 'nail'],
  ['parafuso', 'screw'],
  ['bucha', 'wall anchor'],
  ['arame', 'wire'],
  ['fita isolante', 'electrical tape'],
  ['disco de corte', 'cutting disc'],
  ['lixa', 'sandpaper'],
  ['tinta acrilica', 'paint'],
  ['tinta latex', 'paint'],
  ['pincel', 'paint brush'],
  ['rolo de pintura', 'paint roller'],
  ['massa corrida', 'putty'],
  ['cimento', 'cement'],
  ['argamassa', 'mortar'],

  // Saúde / bem-estar
  ['alcool', 'alcohol'],
  ['alcool em gel', 'hand sanitizer'],
  ['termometro', 'thermometer'],
  ['medicamento', 'medicine'],
  ['remedio', 'medicine'],
  ['vitamina', 'vitamins'],
  ['suplemento', 'supplements'],
  ['curativo', 'bandage'],
  ['gaze', 'gauze'],
  ['esparadrapo', 'medical tape'],
  ['soro fisiologico', 'saline solution'],
  ['protetor solar', 'sunscreen'],
  ['repelente', 'insect repellent'],
  ['preservativo', 'condom'],

  // Pet
  ['racao', 'pet food'],
  ['petisco', 'pet treat'],
  ['coleira', 'pet collar'],
  ['caixa de areia', 'litter box'],
  ['brinquedo pet', 'dog toy'],

  // Brinquedos / crianças
  ['brinquedo', 'toy'],
  ['boneca', 'doll'],
  ['carrinho', 'toy car'],
  ['bola', 'ball'],
  ['puzzle', 'puzzle'],
  ['jogo', 'board game'],
  ['patinete', 'scooter'],
  ['bicicleta', 'bicycle'],
  ['capacete', 'helmet'],

  // Roupas / calçados
  ['camiseta', 't-shirt'],
  ['camisa', 'shirt'],
  ['calca', 'pants'],
  ['bermuda', 'shorts'],
  ['saia', 'skirt'],
  ['vestido', 'dress'],
  ['jaqueta', 'jacket'],
  ['casaco', 'coat'],
  ['meia', 'sock'],
  ['cueca', 'underwear'],
  ['sutiã', 'bra'],
  ['tenis', 'sneakers'],
  ['sapato', 'shoe'],
  ['sandalia', 'sandal'],
  ['chinelo', 'flip flop'],
  ['bota', 'boot'],

  // Beleza / cosméticos
  ['batom', 'lipstick'],
  ['base', 'foundation'],
  ['po', 'face powder'],
  ['rimel', 'mascara'],
  ['esmalte', 'nail polish'],
  ['creme facial', 'face cream'],
  ['protetor labial', 'lip balm'],
  ['pente', 'comb'],
  ['escova de cabelo', 'hair brush'],
  ['secador', 'hair dryer'],
  ['chapinha', 'hair straightener'],

  // Livros / papel
  ['livro', 'book'],
  ['revista', 'magazine'],
  ['quadro', 'picture frame'],

  // Esportes / fitness
  ['halter', 'dumbbell'],
  ['peso', 'weight'],
  ['esteira', 'treadmill'],
  ['bicleta ergometrica', 'exercise bike'],
  ['corda', 'jump rope'],
  ['garrafa de agua', 'water bottle'],
  ['mochila', 'backpack'],
  ['bola de futebol', 'soccer ball'],

  // Jardim / plantas
  ['vaso', 'flower pot'],
  ['planta', 'plant'],
  ['semente', 'seeds'],
  ['adubo', 'fertilizer'],
  ['regador', 'watering can'],
  ['pá de jardim', 'garden shovel'],
  ['cortador de grama', 'lawn mower'],
];

// ============================================================
// Encontra a melhor tag em inglês para o nome do produto
// ============================================================
function tagParaProduto(nome) {
  if (!nome) return 'product';
  const nomeLower = nome.toLowerCase();

  for (const [pt, en] of DICIONARIO) {
    if (nomeLower.includes(pt)) {
      return en;
    }
  }

  return 'product';
}

(async () => {
  try {
    console.log('⏳ Buscando produtos...');

    const { rows: produtos } = await db.query(
      'SELECT id, name FROM products ORDER BY id'
    );

    console.log(`📦 ${produtos.length} produtos encontrados.\n`);

    let atualizados = 0;
    const tagsUsadas = new Map(); // estatística

    for (const p of produtos) {
      const tag = tagParaProduto(p.name);
      const url = `https://loremflickr.com/600/400/${encodeURIComponent(tag)}?lock=${p.id}`;

      await db.query(
        'UPDATE products SET image_url = $1 WHERE id = $2',
        [url, p.id]
      );

      tagsUsadas.set(tag, (tagsUsadas.get(tag) || 0) + 1);
      atualizados++;

      if (atualizados % 10 === 0) process.stdout.write(`   ... ${atualizados}/${produtos.length}\n`);
    }

    console.log(`\n✅ ${atualizados} produtos atualizados!\n`);
    console.log('📊 Tags mais usadas (top 20):');
    [...tagsUsadas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([tag, qty]) => console.log(`   • ${tag}: ${qty} produto(s)`));

    console.log('\n🌐 Fonte: https://loremflickr.com (tags baseadas no nome do produto)');
    console.log('💡 Dica: para fotos 100% fiéis, use o upload por arquivo na tela de Produtos.');

    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
