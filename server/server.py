
from flask import Flask, request, jsonify # pyright: ignore[reportMissingImports]
from flask_cors import CORS # pyright: ignore[reportMissingModuleSource]

app = Flask(__name__)
CORS(app)



schema_clusters = []

def calculate_similarity(fp1, fp2):
    """Calculates Jaccard Similarity between two lists of strings"""
    set1, set2 = set(fp1), set(fp2)
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    if union == 0: return 0
    return intersection / union

@app.route('/ingest', methods=['POST'])
def ingest_data():
    try:
        payload = request.get_json()
        raw_data = payload.get('rawData')
        fingerprint = payload.get('fingerprint')
        source_type = payload.get('sourceType', 'Unknown')
        url = payload.get('url', 'Unknown URL')

        
        matched_cluster = None
        for cluster in schema_clusters:
            similarity = calculate_similarity(fingerprint, cluster['fingerprint'])
            
            
            if similarity > 0.85:
                matched_cluster = cluster
                break
        
        
        if matched_cluster:
            
            if len(matched_cluster['samples']) < 5:
                matched_cluster['samples'].append(raw_data)
            
            
            if source_type not in matched_cluster['sources']:
                matched_cluster['sources'].append(source_type)
                
            print(f"📦 Grouped {source_type} payload into Cluster #{matched_cluster['id']}")
        else:
            new_id = len(schema_clusters) + 1
            schema_clusters.append({
                "id": new_id,
                "fingerprint": fingerprint,
                "samples": [raw_data],
                "sources": [source_type],
                "example_url": url
            })
            print(f"🌱 Created new Schema Branch from {source_type}: Cluster #{new_id}")

        return jsonify({"status": "success"}), 200
    except Exception as e:
        print(f"Error handling data: {e}")
        return jsonify({"status": "error"}), 400

@app.route('/tree', methods=['GET'])
def get_tree():
    return jsonify(schema_clusters), 200

if __name__ == '__main__':
    app.run(port=5001, debug=True)