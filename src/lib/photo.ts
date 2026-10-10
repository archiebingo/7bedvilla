export type Photo = {
	index: number;
	src: string;
	srcSmall: string;
	alt: string;
	caption: string;
	width: number;
	height: number;
};

export function photoByIndex(photos: readonly Photo[], index: number): Photo {
	const found = photos.find((p) => p.index === index);
	if (!found) throw new Error(`photo ${index} not available`);
	return found;
}
