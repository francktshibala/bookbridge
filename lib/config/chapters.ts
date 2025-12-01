/**
 * Chapter Structures for Featured Books
 * 
 * Centralized chapter definitions for all bundle-architecture books
 */

export interface Chapter {
  chapterNumber: number;
  title: string;
  startSentence: number;
  endSentence: number;
  startBundle: number;
  endBundle: number;
}

// Sleepy Hollow Chapter Structure
export const SLEEPY_HOLLOW_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "The Schoolmaster of Sleepy Hollow",
    startSentence: 0,
    endSentence: 79,
    startBundle: 0,
    endBundle: 19
  },
  {
    chapterNumber: 2,
    title: "The Legend and the Lady",
    startSentence: 80,
    endSentence: 199,
    startBundle: 20,
    endBundle: 49
  },
  {
    chapterNumber: 3,
    title: "The Party and the Pursuit",
    startSentence: 200,
    endSentence: 279,
    startBundle: 50,
    endBundle: 69
  },
  {
    chapterNumber: 4,
    title: "The Encounter and the Mystery",
    startSentence: 280,
    endSentence: 324,
    startBundle: 70,
    endBundle: 81
  }
];

// The Necklace Chapter Structure
export const THE_NECKLACE_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "The Invitation",
    startSentence: 0,
    endSentence: 78,
    startBundle: 0,
    endBundle: 19
  },
  {
    chapterNumber: 2,
    title: "The Ball",
    startSentence: 79,
    endSentence: 98,
    startBundle: 20,
    endBundle: 24
  },
  {
    chapterNumber: 3,
    title: "The Loss",
    startSentence: 99,
    endSentence: 138,
    startBundle: 25,
    endBundle: 34
  },
  {
    chapterNumber: 4,
    title: "The Sacrifice",
    startSentence: 139,
    endSentence: 178,
    startBundle: 35,
    endBundle: 44
  },
  {
    chapterNumber: 5,
    title: "The Truth",
    startSentence: 179,
    endSentence: 195,
    startBundle: 45,
    endBundle: 48
  }
];

// The Dead Chapter Structure
export const THE_DEAD_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "The Party Begins",
    startSentence: 0,
    endSentence: 35,
    startBundle: 0,
    endBundle: 8
  },
  {
    chapterNumber: 2,
    title: "Dinner and Dancing",
    startSentence: 36,
    endSentence: 71,
    startBundle: 9,
    endBundle: 17
  },
  {
    chapterNumber: 3,
    title: "Gabriel's Speech",
    startSentence: 72,
    endSentence: 107,
    startBundle: 18,
    endBundle: 26
  },
  {
    chapterNumber: 4,
    title: "The Journey Home",
    startSentence: 108,
    endSentence: 143,
    startBundle: 27,
    endBundle: 35
  },
  {
    chapterNumber: 5,
    title: "The Revelation",
    startSentence: 144,
    endSentence: 179,
    startBundle: 36,
    endBundle: 44
  }
];

// The Lady with the Dog Chapter Structure
export const THE_LADY_WITH_DOG_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "First Meeting",
    startSentence: 0,
    endSentence: 32,
    startBundle: 0,
    endBundle: 7
  },
  {
    chapterNumber: 2,
    title: "The Affair Begins",
    startSentence: 33,
    endSentence: 65,
    startBundle: 8,
    endBundle: 16
  },
  {
    chapterNumber: 3,
    title: "Departure and Separation",
    startSentence: 66,
    endSentence: 98,
    startBundle: 17,
    endBundle: 24
  },
  {
    chapterNumber: 4,
    title: "The Reunion",
    startSentence: 99,
    endSentence: 131,
    startBundle: 25,
    endBundle: 32
  },
  {
    chapterNumber: 5,
    title: "True Love Revealed",
    startSentence: 132,
    endSentence: 164,
    startBundle: 33,
    endBundle: 40
  }
];

// Yellow Wallpaper Chapter Structure
export const YELLOW_WALLPAPER_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "Arrival at the Estate",
    startSentence: 0,
    endSentence: 95,
    startBundle: 0,
    endBundle: 23
  },
  {
    chapterNumber: 2,
    title: "Growing Unease",
    startSentence: 96,
    endSentence: 187,
    startBundle: 24,
    endBundle: 46
  },
  {
    chapterNumber: 3,
    title: "Obsession with the Pattern",
    startSentence: 188,
    endSentence: 279,
    startBundle: 47,
    endBundle: 69
  },
  {
    chapterNumber: 4,
    title: "The Final Revelation",
    startSentence: 280,
    endSentence: 371,
    startBundle: 70,
    endBundle: 92
  }
];

// Gift of the Magi Chapter Structure
export const GIFT_OF_THE_MAGI_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "Pennies and Parsimony",
    startSentence: 0,
    endSentence: 7,
    startBundle: 0,
    endBundle: 1
  },
  {
    chapterNumber: 2,
    title: "Della's Christmas Eve Predicament",
    startSentence: 8,
    endSentence: 19,
    startBundle: 2,
    endBundle: 4
  },
  {
    chapterNumber: 3,
    title: "Saving for Jim's Present",
    startSentence: 20,
    endSentence: 31,
    startBundle: 5,
    endBundle: 7
  },
  {
    chapterNumber: 4,
    title: "The Unrivaled Platinum Chain",
    startSentence: 32,
    endSentence: 39,
    startBundle: 8,
    endBundle: 9
  },
  {
    chapterNumber: 5,
    title: "Jim's Quiet Entrance",
    startSentence: 40,
    endSentence: 47,
    startBundle: 10,
    endBundle: 11
  },
  {
    chapterNumber: 6,
    title: "Awakening to Love's Worth",
    startSentence: 48,
    endSentence: 50,
    startBundle: 12,
    endBundle: 12
  }
];

// Jekyll & Hyde Chapter Structure
export const JEKYLL_HYDE_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "Story of the Door",
    startSentence: 0,
    endSentence: 137,
    startBundle: 0,
    endBundle: 34
  },
  {
    chapterNumber: 2,
    title: "Search for Mr. Hyde",
    startSentence: 138,
    endSentence: 275,
    startBundle: 35,
    endBundle: 68
  },
  {
    chapterNumber: 3,
    title: "Dr. Jekyll Was Quite at Ease",
    startSentence: 276,
    endSentence: 413,
    startBundle: 69,
    endBundle: 103
  },
  {
    chapterNumber: 4,
    title: "The Carew Murder Case",
    startSentence: 414,
    endSentence: 551,
    startBundle: 104,
    endBundle: 137
  },
  {
    chapterNumber: 5,
    title: "Incident of the Letter",
    startSentence: 552,
    endSentence: 689,
    startBundle: 138,
    endBundle: 172
  },
  {
    chapterNumber: 6,
    title: "Remarkable Incident of Dr. Lanyon",
    startSentence: 690,
    endSentence: 827,
    startBundle: 173,
    endBundle: 206
  },
  {
    chapterNumber: 7,
    title: "Incident at the Window",
    startSentence: 828,
    endSentence: 965,
    startBundle: 207,
    endBundle: 241
  },
  {
    chapterNumber: 8,
    title: "The Last Night",
    startSentence: 968,
    endSentence: 1287,
    startBundle: 242,
    endBundle: 321
  }
];

// Great Gatsby Chapter Structure
export const GREAT_GATSBY_CHAPTERS: Chapter[] = [
  {
    chapterNumber: 1,
    title: "Nick Arrives in West Egg",
    startSentence: 0,
    endSentence: 379,
    startBundle: 0,
    endBundle: 94
  },
  {
    chapterNumber: 2,
    title: "The Valley of Ashes",
    startSentence: 380,
    endSentence: 736,
    startBundle: 95,
    endBundle: 184
  },
  {
    chapterNumber: 3,
    title: "Gatsby's Party",
    startSentence: 737,
    endSentence: 1145,
    startBundle: 185,
    endBundle: 286
  },
  {
    chapterNumber: 4,
    title: "The Truth About Gatsby",
    startSentence: 1146,
    endSentence: 1561,
    startBundle: 287,
    endBundle: 390
  },
  {
    chapterNumber: 5,
    title: "The Reunion",
    startSentence: 1562,
    endSentence: 1879,
    startBundle: 391,
    endBundle: 469
  },
  {
    chapterNumber: 6,
    title: "The Past Revealed",
    startSentence: 1880,
    endSentence: 2162,
    startBundle: 470,
    endBundle: 540
  },
  {
    chapterNumber: 7,
    title: "The Confrontation",
    startSentence: 2163,
    endSentence: 2965,
    startBundle: 541,
    endBundle: 741
  },
  {
    chapterNumber: 8,
    title: "The Tragedy",
    startSentence: 2966,
    endSentence: 3322,
    startBundle: 742,
    endBundle: 830
  },
  {
    chapterNumber: 9,
    title: "The End of the Dream",
    startSentence: 3323,
    endSentence: 3604,
    startBundle: 831,
    endBundle: 901
  }
];

