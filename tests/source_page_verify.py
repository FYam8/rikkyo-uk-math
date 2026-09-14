import json,fitz,math
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).resolve().parent.parent
qs=json.loads((root/'data'/'questions.json').read_text(encoding='utf-8'))
seen={}
for q in qs:
    seen[(q['sourceDocument'],q['sourcePdfPage'],q['sourcePageImage'])]=1
assert len(seen)==31,len(seen)
errs=[]; vals=[]
for doc,pno,imgrel in seen:
    pdf=Path('/mnt/data')/doc
    assert pdf.exists(),pdf
    img=Image.open(root/imgrel).convert('RGB')
    d=fitz.open(pdf); page=d[pno-1]; pix=page.get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False); d.close()
    fresh=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
    if img.size!=fresh.size:
        errs.append((doc,pno,'size',img.size,fresh.size));continue
    st=ImageStat.Stat(ImageChops.difference(img,fresh))
    rms=math.sqrt(sum(v*v for v in st.rms)/3);vals.append(rms)
    if rms>10:errs.append((doc,pno,'rms',rms))
assert not errs,errs
print(f'PASS source pages: 31/31 fresh-render match, max RMS={max(vals):.3f}')
