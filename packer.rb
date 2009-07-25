#!/usr/bin/ruby

# A ruby script to create the packed version of the rhizosphere library
#
# This script uses the YUI compressor (http://developer.yahoo.com/yui/compressor/ )
# that you have to download separately

require 'fileutils'

COMPRESSOR_PATH = "/Users/battlehorse/Documents/Devel/yuicompressor-2.3.6/build/yuicompressor-2.3.6.jar"
OUTPUT_FILE = "./src/js/pack/rhizo.pack.js"
INPUT_FILES = %w( base meta layout layout.tree model autorender gviz ui ) # order is important!

File.open("./rhizo.bundle.js", "w") do |bf|
  INPUT_FILES.each do |f|
    puts "Bundling #{f}"
    File.open("./src/js/rhizo.#{f}.js", "r") { |f| bf.puts f.read() + "\n" }
  end
end

puts "Packing ..."
success = system("java -jar #{COMPRESSOR_PATH} --type js --line-break 100 -v -o #{OUTPUT_FILE} ./rhizo.bundle.js")
FileUtils.rm "./rhizo.bundle.js" if success
puts "Done."