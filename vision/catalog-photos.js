// Local reference photography, not product inventory. See assets/photo-sources.json.
export function clothingPhoto(id, {alt='', className='', eager=false}={}) {
  const image=document.createElement('img');
  image.src=`assets/clothes/${id}.jpg`;
  image.alt=alt;image.className=className;image.loading=eager?'eager':'lazy';image.decoding='async';image.width=640;image.height=800;
  image.addEventListener('error',()=>{image.hidden=true;image.parentElement?.classList.add('photo-unavailable');});
  return image;
}
export function questionPhoto(key,value) {
  const maps={style:{casual:'tee',smart:'blazer',street:'hoodie',minimal:'shirt'},occasion:{daily:'jeans',work:'blazer',social:'skirt'},climate:{warm:'tee',mild:'overshirt',cold:'coat'}};
  if(['wardrobe','avoid'].includes(key))return value;
  return maps[key]?.[value]||null;
}
