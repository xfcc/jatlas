import { parseMinnanoActressProfileHtml } from '../../apps/desktop/core/minnanoProfileService';

describe('minnano profile service', () => {
  it('parses actress profile fields from Minnano html', () => {
    const html = `
      <html>
        <head>
          <link rel="canonical" href="https://www.minnano-av.com/actress832690.html">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "奥田咲",
              "alternateName": "おくださき",
              "additionalName": "Okuda Saki",
              "birthDate": "1992-06-15",
              "url": "https://www.minnano-av.com/actress832690.html"
            }
          </script>
        </head>
        <body>
          <h1>奥田咲<span>おくださき / Okuda Saki</span></h1>
          <div class="act-profile">
            <table>
              <tr><td><span>生年月日</span><p>1992年06月15日（現在 33歳）</p></td></tr>
              <tr><td><span>サイズ</span><p>T148 / B92(<a>Hカップ</a>) / W55 / H80 / S</p></td></tr>
              <tr><td><span>AV出演期間</span><p>2011年 -</p></td></tr>
              <tr><td><span>別名</span><p>奥田さき、Okuda Alias</p></td></tr>
              <tr>
                <td><span>タグ</span>
                  <div class="tagarea">
                    <a>美爆乳</a>
                    <a>巨乳</a>
                    <a>パフィーニップル，美体，美肌</a>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    expect(parseMinnanoActressProfileHtml(html, 'https://example.test')).toEqual({
      sourceUrl: 'https://www.minnano-av.com/actress832690.html',
      matchedName: '奥田咲',
      roman: 'Okuda Saki',
      aliases: ['奥田さき', 'Okuda Alias'],
      birthday: '1992年06月15日',
      cup: 'H',
      bust: '92',
      waist: '55',
      hip: '80',
      career_from: '2011年',
      career_to: '',
      tags: ['美爆乳', '巨乳', 'パフィーニップル', '美体', '美肌'],
    });
  });

  it('does not treat pronunciation as aliases', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "奥田咲",
              "alternateName": "おくださき",
              "additionalName": "Okuda Saki"
            }
          </script>
        </head>
        <body>
          <h1>奥田咲<span>おくださき / Okuda Saki</span></h1>
          <div class="act-profile"><table><tr><td><span>タグ</span><div class="tagarea"><a>美人</a></div></td></tr></table></div>
        </body>
      </html>
    `;

    expect(parseMinnanoActressProfileHtml(html, 'https://example.test').aliases).toEqual([]);
  });
});
