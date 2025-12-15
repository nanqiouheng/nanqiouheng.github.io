from flask import Flask, request, jsonify
import jmcomic
from jmcomic import JmSearchResult, get_album

app = Flask(__name__)

@app.route('/search', methods=['GET'])
def search_comics():
    keyword = request.args.get('keyword')
    if not keyword:
        return jsonify({'error': 'Keyword required'}), 400
    result = JmSearchResult.search(keyword)
    comics = [{'id': album.id, 'title': album.title, 'author': album.author} for album in result.album_list]
    return jsonify({'comics': comics})

@app.route('/comic/<album_id>', methods=['GET'])
def get_comic(album_id):
    album = get_album(album_id)
    details = {
        'title': album.title,
        'author': album.author,
        'tags': album.tags,
        'images': [img.url for img in album.photo_list]  # Fetches decrypted image URLs
    }
    return jsonify(details)

if __name__ == '__main__':
    app.run(debug=True)
