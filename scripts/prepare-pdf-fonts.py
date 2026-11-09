"""Create static PDF font subsets from upstream Noto Sans / Noto Sans JP.

Usage (fonttools is only required for font maintenance, never for the website):
  python scripts/prepare-pdf-fonts.py --latin NotoSans.ttf --japanese NotoSansJP.ttf
Keep assets/fonts/OFL-*.txt alongside the generated subsets.
"""
import argparse
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

parser = argparse.ArgumentParser()
parser.add_argument('--latin', required=True)
parser.add_argument('--japanese', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
out = root / 'assets' / 'fonts'
out.mkdir(parents=True, exist_ok=True)
source_text = ''.join(path.read_text() for path in (root / 'src').glob('*.js'))

for source, family, japanese in [(args.latin, 'NihongoLatin', False), (args.japanese, 'NihongoJapanese', True)]:
    font = TTFont(source)
    if 'fvar' in font:
        axes = {axis.axisTag: axis.defaultValue for axis in font['fvar'].axes}
        axes['wght'] = 400
        font = instantiateVariableFont(font, axes, inplace=True)
    wanted = set(range(0x3000, 0x3100)) | {ord(char) for char in source_text if ord(char) >= 0x2000} if japanese else (
        set(range(0x20, 0x250)) | set(range(0x1E00, 0x1F00)) | set(range(0x2000, 0x2070)) | set(range(0x2190, 0x2200))
    )
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_languages = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=wanted & set(font.getBestCmap()))
    subsetter.subset(font)
    # Modified fonts use distinct family names (upstream OFL reserved-name rule).
    for record in font['name'].names:
        if record.nameID in [1, 2, 3, 4, 6, 16, 17]:
            value = {1:family, 2:'Regular', 3:f'{family}-Regular', 4:f'{family} Regular',
                     6:f'{family}-Regular', 16:family, 17:'Regular'}[record.nameID]
            record.string = value.encode(record.getEncoding(), errors='replace')
    target = out / f'{family}-Regular.ttf'
    font.save(target)
    print(f'{target.relative_to(root)}: {target.stat().st_size:,} bytes')
