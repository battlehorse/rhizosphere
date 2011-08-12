/*
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

package com.rhizospherejs.gwt.showcase.client.books;

import com.google.gwt.ajaxloader.client.AjaxLoader;
import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JsArray;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.KeyCodes;
import com.google.gwt.event.dom.client.KeyPressEvent;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiFactory;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.uibinder.client.UiHandler;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.DialogBox;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.Widget;

import com.rhizospherejs.gwt.client.Rhizosphere;
import com.rhizospherejs.gwt.client.RhizosphereCallback1;
import com.rhizospherejs.gwt.client.RhizosphereKind;
import com.rhizospherejs.gwt.client.RhizosphereLazyPanel;
import com.rhizospherejs.gwt.client.RhizosphereMetaModel;
import com.rhizospherejs.gwt.client.RhizosphereModelRef;
import com.rhizospherejs.gwt.client.RhizosphereOptions;
import com.rhizospherejs.gwt.client.RhizosphereOptions.LogLevel;
import com.rhizospherejs.gwt.client.handlers.ReadyEvent;
import com.rhizospherejs.gwt.client.handlers.SelectionEvent;
import com.rhizospherejs.gwt.showcase.client.resources.Resources;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Tab that demonstrates Rhizosphere integration with an external datasource.
 * In this case we feed Rhizosphere with a feed of JSON object from Google
 * Books Search.
 * <p>
 * Rhizosphere models are {@link Book} instances built from each entry in the
 * JSON feed received from Google Books Search. The visualization metamodel and
 * renderer are explicitly defined.
 * <p>
 * This code also demonstrates the usage of {@link RhizosphereLazyPanel} to hide
 * Rhizosphere loading details, the dynamic addition and removal of items to
 * the same visualization and programmatic interaction in response to selection
 * events performed on the visualization.
 *
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public class BooksTab extends Composite {
  interface BooksTabUI extends UiBinder<Widget, BooksTab> {}
  private BooksTabUI ui = GWT.create(BooksTabUI.class);

  public static Widget get() {
    return new BooksTab();
  }

  @UiField
  TextBox searchInput;

  @UiField
  Button submitButton;

  @UiField
  Button removeButton;

  @UiField
  Label loadingMessage;
 
  @UiField
  Label errorMessage;
  
  @UiField
  Label noResultsMessage;
  
  @UiField
  RhizosphereLazyPanel<Book> rhizospherePanel;
  
  // Create the Rhizosphere panel using a factory method, to be able to define
  // our own Rhizosphere builder.
  @UiFactory
  RhizosphereLazyPanel<Book> createRhizospherePanel() {
    RhizosphereLazyPanel<Book> panel = new RhizosphereLazyPanel<Book>(
        new Image(Resources.INSTANCE.loadingIcon()),
        new RhizosphereBuilder());
    // Wait 200ms before showing the loading icon, to avoid flickering if
    // Rhizosphere loads quickly enough.
    panel.setLoadingDelayMillis(200);
    return panel;
  }
  
  /**
   * Creates a Rhizosphere instance to fit within the Rhizosphere panel.
   */
  private class RhizosphereBuilder implements RhizosphereLazyPanel.RhizosphereBuilder<Book> {

    @Override
    public Rhizosphere<Book> build() {
      // Create some default options.
      RhizosphereOptions<Book> options = RhizosphereOptions.create();
      options.setTemplate("default");
      
      options.setEnableHTML5History(false);
      options.setEnableLoadingIndicator(false);
      options.setLogLevel(LogLevel.DEBUG);

      // Create a new Rhizosphere visualization suited to display Book objects.
      Rhizosphere<Book> rhizosphere = new Rhizosphere<Book>(options);

      // Register an handler that will trigger once Rhizosphere is ready
      // for user interaction, at which point we enable search
      // functionality.
      rhizosphere.addReadyHandler(new ReadyEvent.Handler() {
        @Override
        public void onReady(ReadyEvent event) {
          if (event.isSuccess()) {
            rhizosphereLoaded = true;
          } else {
            errorMessage.setText("An error occurred:" + event.getErrorDetails());
            errorMessage.setVisible(true);
          }
        }
      });
      
      // Register an handler to be notified whenever selections are performed
      // within the visualization.
      rhizosphere.addSelectionHandler(new SelectionHandler());

      // Explicitly define the visualization metamodel, defining which fields
      // the user should be able to interact with.
      RhizosphereMetaModel meta = RhizosphereMetaModel.create();
      meta.newAttribute("authors").
        setKind(RhizosphereKind.STRING).
        setLabel("Authors");
      meta.newAttribute("titleNoFormatting").
        setKind(RhizosphereKind.STRING).
        setLabel("Title");        
      meta.newAttribute("bookId").
        setKind(RhizosphereKind.STRING).
        setLabel("ISBN");
      meta.newAttribute("publishedYear").
        setKind(RhizosphereKind.RANGE).
        setLabel("Published Year");
      meta.newAttribute("pageCount").
        setKind(RhizosphereKind.RANGE).
        setLabel("Num Pages");
      meta.newAttribute("query").
        setKind(RhizosphereKind.CATEGORY).
        setLabel("Search query").
        setCategories(/* auto-infer categories */ null, false, true);

      // Registers the metamodel and renderer.
      rhizosphere.setMetaModel(meta);
      rhizosphere.setRenderer(new BookRenderer(books, rhizosphere));
      return rhizosphere;
    }
  }  

  /**
   * Handler that responds to book selections performed within the
   * visualization. It guides the 'remove' functionality: the 'remove' button
   * will remove selected books only, if the selection is not empty.
   * 
   */
  private class SelectionHandler implements SelectionEvent.Handler {
    @Override
    public void onSelection(SelectionEvent event) {
       if (event.getAction().equals("focus") ||
           event.getAction().equals("hide") ||
           event.getAction().equals("deselectAll") ||
           event.getAction().equals("resetFocus")) {
         // All these actions clear the set of selected books.
         selectedBooks.clear();
       } else if (event.getAction().equals("select")) {
         selectedBooks.addAll(event.getModelRefs());
       } else if (event.getAction().equals("deselect")) {
         selectedBooks.removeAll(event.getModelRefs());
       } else if (event.getAction().equals("selectAll")) {
         selectedBooks.addAll(books.values());
       }
       if (selectedBooks.size() == 0) {
         removeButton.setText("Remove all");
       } else {
         removeButton.setText("Remove selected");
       }
    }
  }
  
  /**
   * Defines whether the Google Book Search API have been loaded.
   */
  private boolean searchApiLoaded;
  
  /**
   * Defines whether the Rhizosphere API have been loaded.
   */
  private boolean rhizosphereLoaded;

  /**
   * The set of books currently part of the Rhizosphere visualization, keyed
   * by their id (usually their ISBN code).
   */
  private Map<String, RhizosphereModelRef> books = new HashMap<String, RhizosphereModelRef>();
  
  /**
   * The set of books currently selected.
   */
  private Set<RhizosphereModelRef> selectedBooks = new HashSet<RhizosphereModelRef>();

  private BooksTab() {
    searchApiLoaded = false;
    initWidget(ui.createAndBindUi(BooksTab.this));
    Resources.INSTANCE.booksCss().ensureInjected();

    // Load the Google Book Search APIs.
    AjaxLoader.loadApi("search", "1", new Runnable() {
      @Override
      public void run() {
        searchApiLoaded = true;
      }
    }, null);
  }
  
  @Override
  public void setVisible(boolean visible) {
    // When this tab becomes visible, trigger the lazy loading of the
    // Rhizosphere visualization. This ensures that the Rhizosphere API are
    // loaded only when actually needed.
    super.setVisible(visible);
    if (visible) {
      rhizospherePanel.ensureWidget();
    }
  }

  @UiHandler("searchInput")
  void keyPressed(KeyPressEvent event) {
    if (KeyCodes.KEY_ENTER == event.getNativeEvent().getKeyCode()) {
      searchBooks(null);
    }
  }

  @UiHandler("removeButton")
  void clearBooks(ClickEvent event) {
    Rhizosphere<Book> rhizosphere = rhizospherePanel.getRhizosphere();
    assert rhizosphere != null;
    if (selectedBooks.size() > 0) {
      // If a selection exists, remove from the visualization only the selected
      // books.
      rhizosphere.removeModels(selectedBooks, null);
      Iterator<Map.Entry<String, RhizosphereModelRef>> it = books.entrySet().iterator();
      while (it.hasNext()) {
        Map.Entry<String, RhizosphereModelRef> entry = it.next();
        if (selectedBooks.contains(entry.getValue())) {
          it.remove();
        }
      }
      rhizosphere.doSelection("deselectAll", null, null);
      selectedBooks.clear();
      removeButton.setText("Remove all");
      
    } else {
      // Otherwise remove all the books currently part of the visualization.
      rhizosphere.removeModels(books.values(), null);
      books.clear();      
    }
    if (books.size() == 0) {
      removeButton.setVisible(false);
    }
    noResultsMessage.setVisible(false);
  }

  @UiHandler("submitButton")
  void searchBooks(ClickEvent event) {
    // Disable the search fields and buttons while a search is already in
    // progress.
    showSearchStarted();

    String query = searchInput.getValue();
    if (query.length() == 0) {
      return;
    }
    if (!searchApiLoaded) {
      DialogBox d = new DialogBox(true, true);
      d.setText("Still loading Book Search APIs...");
      d.center();
      return;
    }
    if (!rhizosphereLoaded) {
      DialogBox d = new DialogBox(true, true);
      d.setText("Still loading the Rhizosphere APIs...");
      d.center();
      return;
    }
    doNativeSearch(this, query);
  }
  
  private void showSearchStarted() {
    submitButton.setEnabled(false);
    removeButton.setEnabled(false);
    searchInput.setEnabled(false);
    noResultsMessage.setVisible(false);
    errorMessage.setVisible(false);
    loadingMessage.setVisible(true);    
  }
  
  private void showSearchCompleted(boolean noResults) {
    submitButton.setEnabled(true);
    removeButton.setVisible(true);
    removeButton.setEnabled(true);
    searchInput.setEnabled(true);
    loadingMessage.setVisible(false);
    noResultsMessage.setVisible(noResults);
  }

  // Perform a Google Book Search via JSNI (no GWT bindings are available yet
  // for Google Book Search).
  private native void doNativeSearch(BooksTab tab, String query) /*-{
    // Create a Book Search instance.
    bookSearch = new $wnd.google.search.BookSearch();
    bookSearch.setResultSetSize(8);
    bookSearch.setNoHtmlGeneration();

    // Accumulate results.
    var results = [];
    var curpage = 0;

    // Handler triggered by a Book Search response. Will either request another
    // page of results until enough have been collected, or hand them over back
    // to GWT code.
    var handler = {
      searchDone: function() {        
        for (var i = 0; i < bookSearch.results.length; i++) {
          results.push(bookSearch.results[i]);
        }
        if (results.length > 30 || bookSearch.results.length == 0) {
          tab.@com.rhizospherejs.gwt.showcase.client.books.BooksTab::searchDone(Lcom/google/gwt/core/client/JsArray;Ljava/lang/String;)(results, query);
        } else {
          bookSearch.gotoPage(++curpage);
        }
      }
    }
    // Set searchComplete as the callback function when a search is 
    // complete.  The bookSearch object will have results in it.
    bookSearch.setSearchCompleteCallback(handler, handler.searchDone, null);

    // Specify search quer(ies)
    bookSearch.execute(query);
    
    // Include the required Google branding.
    $wnd.google.search.Search.getBranding('booksBranding');
  }-*/;

  // Callback invoked once a book search completes. Accumulates the results
  // from this search together with the ones from previous searches and update
  // the Rhizosphere visualization.
  void searchDone(final JsArray<Book> searchResults, String query) {
    if (searchResults.length() == 0) {
      showSearchCompleted(true);
      return;
    }
    
    // Accumulates the books returned by the search, keying them by their ISBN
    // and discarding any duplicate books that are already in the
    // visualization.
    Map<String, Book> resultBooks = new HashMap<String, Book>();
    for (int i = 0; i < searchResults.length(); i++) {
      Book b = searchResults.get(i);
      b.addModelIdAndQuery(query);
      if (books.containsKey(b.getBookId())) {
        GWT.log("Duplicate ISBN (" + b.getBookId() + "). Skipping.");
        continue;
      } else {
        resultBooks.put(b.getBookId(), b);
      }
    }
    
    // Add all the remaining books to the Rhizosphere visualization.
    rhizospherePanel.getRhizosphere().addModels(
      resultBooks.values(),
      new RhizosphereCallback1<List<RhizosphereModelRef>>() {
      @Override
      public void run(boolean success, String details, List<RhizosphereModelRef> addedBookRefs) {
        if (!success) {
          errorMessage.setText("An error occurred:" + details);
          errorMessage.setVisible(true);
        }
        
        // Keep track of all the references pointing to the added books,
        // since they will be later used for other actions, such as removal.
        Rhizosphere<Book> rhizosphere = rhizospherePanel.getRhizosphere();
        for (RhizosphereModelRef ref: addedBookRefs) {
          books.put(rhizosphere.resolveModelRef(ref).getBookId(), ref);
        }
        showSearchCompleted(false);
      }
    });
  }
}
