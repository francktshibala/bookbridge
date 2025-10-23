// Mock dictionary with 100 common ESL words for testing
// This will be replaced with real API calls in later increments

interface MockDefinition {
  word: string;
  phonetic: string;
  pronunciation: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  cefrLevel: string;
  source: string;
}

export const MOCK_DICTIONARY: Record<string, MockDefinition> = {
  // A1 Level - Basic everyday words
  apple: {
    word: 'apple',
    phonetic: 'ˈæp.əl',
    pronunciation: 'AP-uhl',
    definition: 'A round fruit that grows on trees. Apples can be red, green, or yellow.',
    example: 'I eat an apple for breakfast every day.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  beautiful: {
    word: 'beautiful',
    phonetic: 'ˈbjuː.tɪ.fəl',
    pronunciation: 'BYOO-ti-fuhl',
    definition: 'Very nice to look at. Something that makes you feel happy when you see it.',
    example: 'The sunset over the ocean was beautiful.',
    partOfSpeech: 'adjective',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  book: {
    word: 'book',
    phonetic: 'bʊk',
    pronunciation: 'buuk',
    definition: 'A thing you read that has many pages with words. Books tell stories or teach things.',
    example: 'She reads a book before going to sleep.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  house: {
    word: 'house',
    phonetic: 'haʊs',
    pronunciation: 'hows',
    definition: 'A building where people live. It has rooms like a kitchen and bedroom.',
    example: 'My house has a big garden in the back.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  water: {
    word: 'water',
    phonetic: 'ˈwɔː.tər',
    pronunciation: 'WAW-ter',
    definition: 'The clear liquid that we drink and that falls from the sky as rain.',
    example: 'Plants need water to grow.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  happy: {
    word: 'happy',
    phonetic: 'ˈhæp.i',
    pronunciation: 'HAP-ee',
    definition: 'Feeling good and pleased. When you smile because something nice happened.',
    example: 'I am happy when I spend time with my friends.',
    partOfSpeech: 'adjective',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  friend: {
    word: 'friend',
    phonetic: 'frend',
    pronunciation: 'frend',
    definition: 'A person you like and who likes you. Someone you enjoy spending time with.',
    example: 'My best friend and I went to the movies.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  family: {
    word: 'family',
    phonetic: 'ˈfæm.ə.li',
    pronunciation: 'FAM-uh-lee',
    definition: 'People who are related to you, like your parents, brothers, and sisters.',
    example: 'My family has dinner together every Sunday.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  // A2 Level - Elementary words
  amazing: {
    word: 'amazing',
    phonetic: 'əˈmeɪ.zɪŋ',
    pronunciation: 'uh-MAY-zing',
    definition: 'Very surprising and wonderful. Something that makes you feel excited.',
    example: 'The magic show was amazing!',
    partOfSpeech: 'adjective',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  adventure: {
    word: 'adventure',
    phonetic: 'ədˈven.tʃər',
    pronunciation: 'ad-VEN-cher',
    definition: 'An exciting experience or journey where new things happen.',
    example: 'Going camping in the mountains was a great adventure.',
    partOfSpeech: 'noun',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  comfortable: {
    word: 'comfortable',
    phonetic: 'ˈkʌm.fər.tə.bəl',
    pronunciation: 'KUHM-fer-tuh-buhl',
    definition: 'Feeling relaxed and not worried. Also means something that feels good.',
    example: 'This chair is very comfortable to sit in.',
    partOfSpeech: 'adjective',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  decide: {
    word: 'decide',
    phonetic: 'dɪˈsaɪd',
    pronunciation: 'dih-SAHYD',
    definition: 'To choose something after thinking about it.',
    example: 'I need to decide what to eat for lunch.',
    partOfSpeech: 'verb',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  explain: {
    word: 'explain',
    phonetic: 'ɪkˈspleɪn',
    pronunciation: 'ik-SPLAYN',
    definition: 'To help someone understand something by telling them about it clearly.',
    example: 'Can you explain how to use this computer program?',
    partOfSpeech: 'verb',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  // B1 Level - Intermediate words
  knowledge: {
    word: 'knowledge',
    phonetic: 'ˈnɒl.ɪdʒ',
    pronunciation: 'NOL-ij',
    definition: 'Information and understanding that you have learned about something.',
    example: 'Her knowledge of history helped her pass the test.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  opportunity: {
    word: 'opportunity',
    phonetic: 'ˌɒp.əˈtjuː.nə.ti',
    pronunciation: 'op-er-TOO-nuh-tee',
    definition: 'A chance to do something good or useful.',
    example: 'This job gives me an opportunity to travel.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  responsible: {
    word: 'responsible',
    phonetic: 'rɪˈspɒn.sə.bəl',
    pronunciation: 'ri-SPON-suh-buhl',
    definition: 'Being the person who must take care of something or someone.',
    example: 'Parents are responsible for taking care of their children.',
    partOfSpeech: 'adjective',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  // Common words that appear in literature
  character: {
    word: 'character',
    phonetic: 'ˈkær.ək.tər',
    pronunciation: 'KAR-ik-ter',
    definition: 'A person in a story, book, or movie.',
    example: 'Elizabeth is the main character in Pride and Prejudice.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  emotion: {
    word: 'emotion',
    phonetic: 'ɪˈməʊ.ʃən',
    pronunciation: 'ih-MOH-shuhn',
    definition: 'A strong feeling like happiness, sadness, anger, or fear.',
    example: 'She showed her emotions by crying at the sad movie.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  society: {
    word: 'society',
    phonetic: 'səˈsaɪ.ə.ti',
    pronunciation: 'suh-SAH-uh-tee',
    definition: 'All the people who live together in a country or area.',
    example: 'In modern society, people use technology every day.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  gentleman: {
    word: 'gentleman',
    phonetic: 'ˈdʒen.təl.mən',
    pronunciation: 'JEN-tuhl-muhn',
    definition: 'A polite and well-behaved man.',
    example: 'Mr. Darcy was considered a true gentleman.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  // Words from the screenshot example
  she: {
    word: 'she',
    phonetic: 'ʃiː',
    pronunciation: 'shee',
    definition: 'A word used to talk about a female person or animal.',
    example: 'She went to the store to buy some bread.',
    partOfSpeech: 'pronoun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  was: {
    word: 'was',
    phonetic: 'wʌz',
    pronunciation: 'wuhz',
    definition: 'Past form of "be". Used to describe how something or someone existed before.',
    example: 'Yesterday was a sunny day.',
    partOfSpeech: 'verb',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  slim: {
    word: 'slim',
    phonetic: 'slɪm',
    pronunciation: 'slim',
    definition: 'Thin in an attractive way. Not fat.',
    example: 'The dancer had a slim figure.',
    partOfSpeech: 'adjective',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  girl: {
    word: 'girl',
    phonetic: 'ɡɜːl',
    pronunciation: 'gurl',
    definition: 'A young female person.',
    example: 'The little girl played with her toys.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  pale: {
    word: 'pale',
    phonetic: 'peɪl',
    pronunciation: 'payl',
    definition: 'Light in color. Not dark or bright.',
    example: 'Her skin was pale because she stayed inside all winter.',
    partOfSpeech: 'adjective',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  skin: {
    word: 'skin',
    phonetic: 'skɪn',
    pronunciation: 'skin',
    definition: 'The outer covering of your body.',
    example: 'Use sunscreen to protect your skin from the sun.',
    partOfSpeech: 'noun',
    cefrLevel: 'A1',
    source: 'Mock ESL Dictionary'
  },

  // Additional common words for testing
  education: {
    word: 'education',
    phonetic: 'ˌed.jʊˈkeɪ.ʃən',
    pronunciation: 'ej-oo-KAY-shuhn',
    definition: 'Learning and studying to gain knowledge and skills.',
    example: 'A good education helps you get a better job.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  technology: {
    word: 'technology',
    phonetic: 'tekˈnɒl.ə.dʒi',
    pronunciation: 'tek-NOL-uh-jee',
    definition: 'Scientific knowledge used to create machines and tools.',
    example: 'Modern technology makes communication much easier.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  environment: {
    word: 'environment',
    phonetic: 'ɪnˈvaɪ.rən.mənt',
    pronunciation: 'in-VAH-ruhn-muhnt',
    definition: 'The natural world around us, including air, water, and land.',
    example: 'We must protect the environment for future generations.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  important: {
    word: 'important',
    phonetic: 'ɪmˈpɔː.tənt',
    pronunciation: 'im-POR-tuhnt',
    definition: 'Something that matters a lot and should be given attention.',
    example: 'It is important to eat healthy food.',
    partOfSpeech: 'adjective',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  different: {
    word: 'different',
    phonetic: 'ˈdɪf.ər.ənt',
    pronunciation: 'DIF-er-uhnt',
    definition: 'Not the same as something else.',
    example: 'These two books are completely different.',
    partOfSpeech: 'adjective',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  remember: {
    word: 'remember',
    phonetic: 'rɪˈmem.bər',
    pronunciation: 'ri-MEM-ber',
    definition: 'To think of something from the past.',
    example: 'I remember my first day at school.',
    partOfSpeech: 'verb',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  understand: {
    word: 'understand',
    phonetic: 'ˌʌn.dəˈstænd',
    pronunciation: 'uhn-der-STAND',
    definition: 'To know what something means.',
    example: 'Do you understand this math problem?',
    partOfSpeech: 'verb',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  wonder: {
    word: 'wonder',
    phonetic: 'ˈwʌn.dər',
    pronunciation: 'WUN-der',
    definition: 'To think about something. To want to know about something.',
    example: 'I wonder what time it is.',
    partOfSpeech: 'verb',
    cefrLevel: 'A2',
    source: 'Mock ESL Dictionary'
  },

  wonders: {
    word: 'wonders',
    phonetic: 'ˈwʌn.dərz',
    pronunciation: 'WUN-derz',
    definition: 'Things that are very surprising or beautiful. Things that make you think "Wow!"',
    example: 'She wonders what to do next.',
    partOfSpeech: 'noun',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  charming: {
    word: 'charming',
    phonetic: 'ˈtʃɑːr.mɪŋ',
    pronunciation: 'CHAR-ming',
    definition: 'Pleasant and nice to be with. Making people like you.',
    example: 'She has a charming smile.',
    partOfSpeech: 'adjective',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  },

  charm: {
    word: 'charm',
    phonetic: 'tʃɑːrm',
    pronunciation: 'charm',
    definition: 'To be pleasant and make people like you.',
    example: 'He can charm anyone with his stories.',
    partOfSpeech: 'verb',
    cefrLevel: 'B1',
    source: 'Mock ESL Dictionary'
  }
};

export function getMockDefinition(word: string): MockDefinition | null {
  const cleanWord = word.toLowerCase().trim();
  return MOCK_DICTIONARY[cleanWord] || null;
}