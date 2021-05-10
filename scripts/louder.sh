mkdir louder
ffmpeg-normalize ../assets/* -ext mp3 -c:a libmp3lame -f
cd ./normalized
for f in *.mp3
do
  ffmpeg -i $f -filter:a "volume=5" ../louder/$f -y
done

