/**
 * @file 단어 데이터 통합
 * @brief HSK 전체 단어 데이터
 */

import { hsk1Words } from './hsk1';
import { hsk2Words } from './hsk2';
import { hsk3Words } from './hsk3';
import { Word, HskLevel } from '../types';

export const allWords: Word[] = [
    ...hsk1Words,
    ...hsk2Words,
    ...hsk3Words,
];

export function getWordsByLevel(nLevel: HskLevel): Word[]
{
    return allWords.filter((word) => word.nLevel === nLevel);
}

export function getWordById(szId: string): Word | undefined
{
    return allWords.find((word) => word.szId === szId);
}

export function getWordCount(nLevel: HskLevel): number
{
    return getWordsByLevel(nLevel).length;
}

export function getTotalWordCount(): number
{
    return allWords.length;
}

export const levelWordCounts: Record<HskLevel, number> = {
    1: hsk1Words.length,
    2: hsk2Words.length,
    3: hsk3Words.length,
    4: 0,
    5: 0,
    6: 0,
};

export { hsk1Words, hsk2Words, hsk3Words };
